export async function apiFetch(
  path: string,
  options: RequestInit & {
    token?: string | null;
    workspaceId?: string | null;
  } = {}
) {
  const { token, workspaceId, headers, ...rest } = options;

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}
