import { proxyToApi } from "../../_lib/proxy-to-api";

export async function GET(request: Request, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params;
  return proxyToApi(request, `/workflow-runs/${runId}`, { method: "GET" });
}
