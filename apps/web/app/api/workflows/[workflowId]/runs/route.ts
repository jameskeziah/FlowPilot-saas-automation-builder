import { NextResponse } from "next/server";
import { prisma } from "@flowpilot/database";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await context.params;

  try {
    const runs = await prisma.workflowRun.findMany({
      where: { workflowId },
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

    return NextResponse.json({ success: true, runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load workflow runs";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
