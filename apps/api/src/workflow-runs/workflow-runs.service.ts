import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@flowpilot/database";
import { executeWorkflowRun, getWorkflowRunDetails } from "@flowpilot/nodes";
import type { AuthContext } from "../auth/auth-context";
import { PrismaService } from "../prisma/prisma.service";
import { QueueService } from "../services/queue.service";

const toInputJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;

@Injectable()
export class WorkflowRunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService
  ) {}

  async runWorkflow(auth: AuthContext, workflowId: string, input: unknown = {}) {
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
      },
      include: {
        activeVersion: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    const version = workflow.activeVersion ?? workflow.versions[0];

    if (!version) {
      throw new NotFoundException("Workflow has no version to execute");
    }

    const workflowRun = await this.prisma.workflowRun.create({
      data: {
        workspaceId: auth.currentWorkspaceId,
        workflowId,
        workflowVersionId: version.id,
        startedById: auth.currentUserId,
        status: "QUEUED",
        input: toInputJson(input),
      },
    });

    const job = await this.queueService.enqueueWorkflowRun({
      workflowId,
      workflowVersionId: version.id,
      workflowRunId: workflowRun.id,
      workspaceId: auth.currentWorkspaceId,
      triggeredById: auth.currentUserId,
      input,
    });

    await this.prisma.auditLog.create({
      data: {
        workspaceId: auth.currentWorkspaceId,
        actorUserId: auth.currentUserId,
        action: "WORKFLOW_RUN",
        entityType: "WorkflowRun",
        entityId: workflowRun.id,
        metadata: toInputJson({ workflowId, source: "api" }),
      },
    });

    return {
      queued: true,
      jobId: job.id,
      workflowId,
      workflowVersionId: version.id,
      workflowRunId: workflowRun.id,
    };
  }

  async runWorkflowDirect(auth: AuthContext, workflowId: string, input: unknown = {}) {
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    const result = await executeWorkflowRun(
      {
        workflowId,
        workspaceId: auth.currentWorkspaceId,
        triggeredById: auth.currentUserId,
        input,
      },
      {
        maxDelayMs: 10_000,
        startMessage: "Direct workflow run started",
        completeMessage: "Direct workflow run completed",
      }
    );

    return getWorkflowRunDetails(result.workflowRunId, auth.currentWorkspaceId);
  }

  async findRunsForWorkflow(auth: AuthContext, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    return this.prisma.workflowRun.findMany({
      where: {
        workflowId,
        workspaceId: auth.currentWorkspaceId,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
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

  async findOne(auth: AuthContext, workflowRunId: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: {
        id: workflowRunId,
        workspaceId: auth.currentWorkspaceId,
      },
      include: {
        stepRuns: {
          orderBy: { createdAt: "asc" },
        },
        logs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!run) {
      throw new NotFoundException("Workflow run not found");
    }

    return run;
  }

  async findLogsForRun(auth: AuthContext, workflowRunId: string) {
    await this.findOne(auth, workflowRunId);

    return this.prisma.executionLog.findMany({
      where: {
        workflowRunId,
        workspaceId: auth.currentWorkspaceId,
      },
      orderBy: { createdAt: "asc" },
    });
  }
}
