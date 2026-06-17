import { proxyToApi } from "../../_lib/proxy-to-api";

export async function GET(request: Request, context: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = await context.params;
  return proxyToApi(request, `/workflows/${workflowId}`, { method: "GET" });
}

export async function PUT(request: Request, context: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = await context.params;
  return proxyToApi(request, `/workflows/${workflowId}`, { method: "PUT" });
}

export async function PATCH(request: Request, context: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = await context.params;
  return proxyToApi(request, `/workflows/${workflowId}`, { method: "PATCH" });
}

export async function DELETE(request: Request, context: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = await context.params;
  return proxyToApi(request, `/workflows/${workflowId}`, { method: "DELETE" });
}
