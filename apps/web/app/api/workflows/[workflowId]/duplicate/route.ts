import { NextResponse } from "next/server";
import { prisma } from "@flowpilot/database";
import type { Prisma } from "@flowpilot/database";

const toInputJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export async function POST(
  _request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await context.params;

  try {
    const source = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
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

    const version = source?.versions[0];
    if (!source || !version) {
      return NextResponse.json({ success: false, error: "Workflow not found" }, { status: 404 });
    }

    const workflow = await prisma.$transaction(async (tx) => {
      const createdWorkflow = await tx.workflow.create({
        data: {
          workspaceId: source.workspaceId,
          name: `${source.name} Copy`,
          status: "DRAFT",
        },
      });

      const createdVersion = await tx.workflowVersion.create({
        data: {
          workflowId: createdWorkflow.id,
          version: 1,
          status: "DRAFT",
          definition: toInputJson(version.definition),
        },
      });

      const nodeIdMap = new Map<string, string>();

      for (const node of version.nodes) {
        const createdNode = await tx.workflowNode.create({
          data: {
            workflowVersionId: createdVersion.id,
            nodeKey: node.nodeKey,
            type: node.type,
            label: node.label,
            positionX: node.positionX,
            positionY: node.positionY,
            config: toInputJson(node.config),
          },
        });
        nodeIdMap.set(node.id, createdNode.id);
      }

      for (const edge of version.edges) {
        const sourceNodeId = nodeIdMap.get(edge.sourceNodeId);
        const targetNodeId = nodeIdMap.get(edge.targetNodeId);
        if (!sourceNodeId || !targetNodeId) continue;

        await tx.workflowEdge.create({
          data: {
            workflowVersionId: createdVersion.id,
            edgeKey: edge.edgeKey,
            sourceNodeId,
            targetNodeId,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
          },
        });
      }

      return tx.workflow.update({
        where: { id: createdWorkflow.id },
        data: { activeVersionId: createdVersion.id },
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
    });

    return NextResponse.json({ success: true, workflow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to duplicate workflow";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
