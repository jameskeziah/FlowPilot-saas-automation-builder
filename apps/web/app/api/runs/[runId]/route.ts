import { NextResponse } from "next/server";
import { prisma } from "@flowpilot/database";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;

  try {
    const run = await prisma.workflowRun.findUnique({
      where: {
        id: runId,
      },
      include: {
        stepRuns: {
          orderBy: {
            createdAt: "asc",
          },
        },
        logs: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json(
        {
          success: false,
          error: "Workflow run not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      run,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load workflow run";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
