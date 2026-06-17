import type { AuthContext } from "./auth-context";

export function tenantWhere(auth: AuthContext) {
  return {
    workspaceId: auth.currentWorkspaceId,
  };
}

export function tenantWhereById(auth: AuthContext, id: string) {
  return {
    id,
    workspaceId: auth.currentWorkspaceId,
  };
}
