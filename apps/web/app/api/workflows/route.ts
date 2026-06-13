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

export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      include: {
        activeVersion: true,
        versions: {
          orderBy: {
            version: "desc",
          },
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

    return NextResponse.json({
      success: true,
      workflows,
    });
  } catch (error) {
    console.error("Failed to load workflows:", error);

    return NextResponse.json(
      {
        error: "Failed to load workflows",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WorkflowPayload;

    if (!Array.isArray(body.nodes)) {
      return NextResponse.json(
        { error: "nodes must be an array" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.edges)) {
      return NextResponse.json(
        { error: "edges must be an array" },
        { status: 400 }
      );
    }

    const workflow = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: {
          email: "demo@flowpilot.local",
        },
        update: {},
        create: {
          email: "demo@flowpilot.local",
          name: "Demo User",
        },
      });

      const workspace = await tx.workspace.upsert({
        where: {
          slug: "demo-workspace",
        },
        update: {},
        create: {
          name: "Demo Workspace",
          slug: "demo-workspace",
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
      });

      const createdWorkflow = await tx.workflow.create({
        data: {
          name: body.name ?? "Untitled Workflow",
          workspaceId: workspace.id,
          status: "DRAFT",
        },
      });

      const version = await tx.workflowVersion.create({
        data: {
          workflowId: createdWorkflow.id,
          version: 1,
          status: "DRAFT",
          definition: toInputJson({
            nodes: body.nodes,
            edges: body.edges,
          }),
        },
      });

      await tx.workflow.update({
        where: {
          id: createdWorkflow.id,
        },
        data: {
          activeVersionId: version.id,
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

      return tx.workflow.findUnique({
        where: {
          id: createdWorkflow.id,
        },
        include: {
          activeVersion: true,
          versions: {
            include: {
              nodes: true,
              edges: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error("Failed to save workflow:", error);

    return NextResponse.json(
      {
        error: "Failed to save workflow",
      },
      {
        status: 500,
      }
    );
  }
}
