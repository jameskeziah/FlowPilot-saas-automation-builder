import { proxyToApi } from "../../../_lib/proxy-to-api";

export async function POST(request: Request, context: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = await context.params;
  return proxyToApi(request, `/workflows/${workflowId}/duplicate`, { method: "POST" });
}
