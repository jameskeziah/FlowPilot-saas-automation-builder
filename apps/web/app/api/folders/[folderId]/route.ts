import { proxyToApi } from "../../_lib/proxy-to-api";

export async function PATCH(request: Request, context: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await context.params;
  return proxyToApi(request, `/folders/${folderId}`, { method: "PATCH" });
}

export async function DELETE(request: Request, context: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await context.params;
  return proxyToApi(request, `/folders/${folderId}`, { method: "DELETE" });
}
