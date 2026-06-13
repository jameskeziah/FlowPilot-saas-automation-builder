import { NextResponse } from "next/server";
import { WorkflowExecutionError, executeWorkflowRun, getWorkflowRunDetails } from "@flowpilot/nodes";

export async function POST(request: Request, context: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as { input?: unknown };
    const result = await executeWorkflowRun(
      {
        workflowId,
        input: body.input,
      },
      {
        maxDelayMs: 10_000,
        startMessage: "Direct workflow run started",
        completeMessage: "Direct workflow run completed",
      }
    );
    const run = await getWorkflowRunDetails(result.workflowRunId);

    return NextResponse.json({
      success: true,
      run,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run workflow directly";
    const workflowRunId = error instanceof WorkflowExecutionError ? error.workflowRunId : undefined;
    const run = workflowRunId ? await getWorkflowRunDetails(workflowRunId) : null;

    return NextResponse.json(
      {
        success: false,
        run,
        error: message,
      },
      { status: 500 }
    );
  }
}
