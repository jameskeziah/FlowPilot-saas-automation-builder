import { proxyToApi } from "../../_lib/proxy-to-api";

export async function PATCH(request: Request, context: { params: Promise<{ tagId: string }> }) {
  const { tagId } = await context.params;
  return proxyToApi(request, `/tags/${tagId}`, { method: "PATCH" });
}

export async function DELETE(request: Request, context: { params: Promise<{ tagId: string }> }) {
  const { tagId } = await context.params;
  return proxyToApi(request, `/tags/${tagId}`, { method: "DELETE" });
}
