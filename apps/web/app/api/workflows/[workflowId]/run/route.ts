import { NextResponse } from "next/server";

type RunResponse = {
  queued?: boolean;
  jobId?: string | number;
  workflowId?: string;
  workflowVersionId?: string;
  workflowRunId?: string;
  error?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await context.params;
  const apiBaseUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  try {
    const body = await request.json().catch(() => ({ input: { source: "manual" } }));
    const response = await fetch(`${apiBaseUrl}/workflows/${workflowId}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = (await response.json()) as RunResponse;

    return NextResponse.json(result, {
      status: response.ok ? 200 : response.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start workflow run";

    return NextResponse.json(
      {
        queued: false,
        workflowId,
        error: message,
      },
      {
        status: 502,
      }
    );
  }
}
