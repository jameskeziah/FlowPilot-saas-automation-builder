import type { Permission, WorkspaceRole } from "./permissions";

export type AuthContext = {
  clerkUserId: string;
  currentUserId: string;
  currentWorkspaceId: string;
  role: WorkspaceRole;
  permissions: Permission[];
};
