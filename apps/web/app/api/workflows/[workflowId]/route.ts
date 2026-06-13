import { NextResponse } from "next/server";
import { prisma } from "@flowpilot/database";
import type { Prisma } from "@flowpilot/database";

type FlowNode = {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data?: Record<string, unknown>;
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

type WorkflowPayload = {
  name?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

const toInputJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

function validatePayload(body: WorkflowPayload) {
  if (!Array.isArray(body.nodes)) return "nodes must be an array";
  if (!Array.isArray(body.edges)) return "edges must be an array";
  return null;
}

async function createVersion(
  tx: Prisma.TransactionClient,
  workflowId: string,
  body: WorkflowPayload
) {
  const latest = await tx.workflowVersion.findFirst({
    where: { workflowId },
    orderBy: { version: "desc" },
  });

  const version = await tx.workflowVersion.create({
    data: {
      workflowId,
      version: (latest?.version ?? 0) + 1,
      status: "DRAFT",
      definition: toInputJson({
        nodes: body.nodes,
        edges: body.edges,
      }),
    },
  });

  const nodeIdMap = new Map<string, string>();

  for (const node of body.nodes) {
    const createdNode = await tx.workflowNode.create({
      data: {
        workflowVersionId: version.id,
        nodeKey: node.id,
        type: node.type,
        label: node.type,
        positionX: node.position.x,
        positionY: node.position.y,
        config: toInputJson(node.data ?? {}),
      },
    });

    nodeIdMap.set(node.id, createdNode.id);
  }

  for (const edge of body.edges) {
    const sourceNodeId = nodeIdMap.get(edge.source);
    const targetNodeId = nodeIdMap.get(edge.target);

    if (!sourceNodeId || !targetNodeId) {
      throw new Error(`Invalid edge ${edge.id}: source or target node missing`);
    }

    await tx.workflowEdge.create({
      data: {
        workflowVersionId: version.id,
        edgeKey: edge.id,
        sourceNodeId,
        targetNodeId,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
      },
    });
  }

  await tx.workflow.update({
    where: { id: workflowId },
    data: {
      name: body.name ?? "Untitled Workflow",
      activeVersionId: version.id,
    },
  });

  return version;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await context.params;

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: {
      activeVersion: true,
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        include: {
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

  if (!workflow) {
    return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, workflow });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await context.params;

  try {
    const body = (await request.json()) as WorkflowPayload;
    const payloadError = validatePayload(body);
    if (payloadError) {
      return NextResponse.json({ success: false, error: payloadError }, { status: 400 });
    }

    const existing = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 });
    }

    const workflow = await prisma.$transaction(async (tx) => {
      await createVersion(tx, workflowId, body);

      return tx.workflow.findUnique({
        where: { id: workflowId },
        include: {
          activeVersion: true,
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            include: {
              nodes: true,
              edges: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ success: true, workflow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update workflow";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await context.params;

  try {
    const existing = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 });
    }

    await prisma.workflow.delete({ where: { id: workflowId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete workflow";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
