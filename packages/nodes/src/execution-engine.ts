import { Prisma, prisma } from "@flowpilot/database";
import type { WorkflowRunJob } from "@flowpilot/shared";
import { getNodeHandler } from "./node-registry";

type WorkflowVersionWithGraph = Prisma.WorkflowVersionGetPayload<{
  include: {
    workflow: true;
    nodes: true;
    edges: {
      include: {
        sourceNode: true;
        targetNode: true;
      };
    };
  };
}>;

type WorkflowNode = WorkflowVersionWithGraph["nodes"][number];

export type ExecuteWorkflowRunOptions = {
  maxDelayMs?: number;
  startMessage?: string;
  completeMessage?: string;
};

export class WorkflowExecutionError extends Error {
  constructor(
    message: string,
    readonly workflowRunId: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "WorkflowExecutionError";
  }
}

const toInputJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;

const toNullableInputJson = (value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  value === undefined ? Prisma.JsonNull : toInputJson(value);

function toRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function orderWorkflowNodes(version: WorkflowVersionWithGraph) {
  const incomingCounts = new Map(version.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>();
  const byId = new Map(version.nodes.map((node) => [node.id, node]));

  for (const edge of version.edges) {
    incomingCounts.set(edge.targetNodeId, (incomingCounts.get(edge.targetNodeId) ?? 0) + 1);
    outgoing.set(edge.sourceNodeId, [...(outgoing.get(edge.sourceNodeId) ?? []), edge.targetNodeId]);
  }

  const queue = version.nodes
    .filter((node) => (incomingCounts.get(node.id) ?? 0) === 0)
    .sort((a, b) => a.positionX - b.positionX || a.positionY - b.positionY);

  const ordered: WorkflowNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    ordered.push(node);

    for (const targetId of outgoing.get(node.id) ?? []) {
      const nextCount = (incomingCounts.get(targetId) ?? 0) - 1;
      incomingCounts.set(targetId, nextCount);
      if (nextCount === 0) {
        const target = byId.get(targetId);
        if (target) queue.push(target);
      }
    }

    queue.sort((a, b) => a.positionX - b.positionX || a.positionY - b.positionY);
  }

  if (ordered.length !== version.nodes.length) {
    throw new Error("Workflow graph contains a cycle or invalid edge state");
  }

  const triggerCount = ordered.filter((node) => node.type === "manual.trigger").length;
  if (triggerCount !== 1) {
    throw new Error("Workflow must contain exactly one manual.trigger node");
  }

  return ordered;
}

async function loadRunnableVersion(job: WorkflowRunJob) {
  if (job.workflowVersionId) {
    return prisma.workflowVersion.findUnique({
      where: { id: job.workflowVersionId },
      include: {
        workflow: true,
        nodes: true,
        edges: {
          include: {
            sourceNode: true,
            targetNode: true,
          },
        },
      },
    });
  }

  const workflow = await prisma.workflow.findUnique({
    where: { id: job.workflowId },
    include: {
      activeVersion: {
        include: {
          workflow: true,
          nodes: true,
          edges: {
            include: {
              sourceNode: true,
              targetNode: true,
            },
          },
        },
      },
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        include: {
          workflow: true,
          nodes: true,
          edges: {
            include: {
              sourceNode: true,
              targetNode: true,
            },
          },
        },
      },
    },
  });

  return workflow?.activeVersion ?? workflow?.versions[0] ?? null;
}

export async function executeWorkflowRun(job: WorkflowRunJob, options: ExecuteWorkflowRunOptions = {}) {
  const version = await loadRunnableVersion(job);

  if (!version) {
    throw new Error(`Workflow ${job.workflowId} has no executable version`);
  }

  const workflowRun = job.workflowRunId
    ? await prisma.workflowRun.update({
        where: { id: job.workflowRunId },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
          workflowVersionId: version.id,
        },
      })
    : await prisma.workflowRun.create({
        data: {
          workflowId: version.workflowId,
          workflowVersionId: version.id,
          status: "RUNNING",
          input: toNullableInputJson(job.input),
          startedAt: new Date(),
        },
      });

  await prisma.executionLog.create({
    data: {
      workflowRunId: workflowRun.id,
      level: "info",
      message: options.startMessage ?? "Workflow run started",
      metadata: toInputJson({ workflowId: version.workflowId, workflowVersionId: version.id }),
    },
  });

  let currentInput = job.input;
  const stepOutputs: Record<string, unknown> = {};

  try {
    for (const node of orderWorkflowNodes(version)) {
      const handler = getNodeHandler(node.type);

      if (!handler) {
        throw new Error(`No node handler registered for ${node.type}`);
      }

      const stepRun = await prisma.workflowStepRun.create({
        data: {
          workflowRunId: workflowRun.id,
          workflowNodeId: node.id,
          nodeKey: node.nodeKey,
          nodeType: node.type,
          status: "RUNNING",
          input: toNullableInputJson(currentInput),
          startedAt: new Date(),
        },
      });

      await prisma.executionLog.create({
        data: {
          workflowRunId: workflowRun.id,
          workflowStepRunId: stepRun.id,
          level: "info",
          message: `Started ${node.type}`,
          metadata: toInputJson({ nodeKey: node.nodeKey }),
        },
      });

      const result = await handler.execute({
        input: currentInput,
        config: toRecord(node.config),
        context: {
          workflowId: version.workflowId,
          workflowVersionId: version.id,
          runId: workflowRun.id,
          nodeId: node.nodeKey,
          workspaceId: version.workflow.workspaceId,
          maxDelayMs: options.maxDelayMs,
        },
      });

      const status = result.status === "success" ? "SUCCESS" : result.status === "skipped" ? "SKIPPED" : "FAILED";

      await prisma.workflowStepRun.update({
        where: { id: stepRun.id },
        data: {
          status,
          output: toNullableInputJson(result.output),
          finishedAt: new Date(),
        },
      });

      const output = toRecord(result.output);

      await prisma.executionLog.create({
        data: {
          workflowRunId: workflowRun.id,
          workflowStepRunId: stepRun.id,
          level: status === "FAILED" ? "error" : "info",
          message: node.type === "debug.log" && typeof output.message === "string" ? output.message : `Finished ${node.type}`,
          metadata: toInputJson({ nodeKey: node.nodeKey, status, output: result.output }),
        },
      });

      if (status === "FAILED") {
        throw new Error(`Node ${node.nodeKey} failed`);
      }

      currentInput = result.output;
      stepOutputs[node.nodeKey] = result.output;
    }

    const output = {
      final: currentInput,
      steps: stepOutputs,
    };

    await prisma.workflowRun.update({
      where: { id: workflowRun.id },
      data: {
        status: "SUCCESS",
        output: toInputJson(output),
        finishedAt: new Date(),
      },
    });

    await prisma.executionLog.create({
      data: {
        workflowRunId: workflowRun.id,
        level: "info",
        message: options.completeMessage ?? "Workflow run completed",
        metadata: toInputJson({ status: "SUCCESS" }),
      },
    });

    return {
      workflowRunId: workflowRun.id,
      workflowVersionId: version.id,
      status: "SUCCESS",
      output,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown workflow execution error";

    await prisma.workflowRun.update({
      where: { id: workflowRun.id },
      data: {
        status: "FAILED",
        error: message,
        finishedAt: new Date(),
      },
    });

    await prisma.executionLog.create({
      data: {
        workflowRunId: workflowRun.id,
        level: "error",
        message,
        metadata: toInputJson({ status: "FAILED" }),
      },
    });

    throw new WorkflowExecutionError(message, workflowRun.id, error);
  }
}

export async function getWorkflowRunDetails(workflowRunId: string) {
  return prisma.workflowRun.findUnique({
    where: { id: workflowRunId },
    include: {
      stepRuns: {
        orderBy: { createdAt: "asc" },
      },
      logs: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
