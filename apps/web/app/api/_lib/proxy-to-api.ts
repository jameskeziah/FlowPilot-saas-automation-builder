import { auth } from "@clerk/nextjs/server";
import { webEnv } from "@flowpilot/env/web";

export async function proxyToApi(request: Request, path: string, init: RequestInit = {}) {
  const { getToken } = await auth();
  const token = await getToken();
  const body = init.body ?? (["GET", "HEAD"].includes(init.method ?? request.method) ? undefined : await request.text());
  const response = await fetch(`${webEnv.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    method: init.method ?? request.method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(request.headers.get("x-workspace-id")
        ? { "x-workspace-id": request.headers.get("x-workspace-id") as string }
        : {}),
      ...init.headers,
    },
    body,
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
