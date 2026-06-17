export type Permission =
  | "workspace:read"
  | "workspace:update"
  | "workspace:delete"
  | "member:read"
  | "member:invite"
  | "member:update"
  | "member:remove"
  | "workflow:read"
  | "workflow:create"
  | "workflow:update"
  | "workflow:delete"
  | "workflow:run"
  | "workflow:publish"
  | "workflow:archive"
  | "folder:read"
  | "folder:create"
  | "folder:update"
  | "folder:delete"
  | "tag:read"
  | "tag:create"
  | "tag:update"
  | "tag:delete"
  | "integration:read"
  | "integration:manage"
  | "credential:read"
  | "credential:manage"
  | "billing:read"
  | "billing:manage"
  | "api_key:read"
  | "api_key:manage"
  | "audit_log:read";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export const rolePermissions: Record<WorkspaceRole, Permission[]> = {
  OWNER: [
    "workspace:read",
    "workspace:update",
    "workspace:delete",
    "member:read",
    "member:invite",
    "member:update",
    "member:remove",
    "workflow:read",
    "workflow:create",
    "workflow:update",
    "workflow:delete",
    "workflow:run",
    "workflow:publish",
    "workflow:archive",
    "folder:read",
    "folder:create",
    "folder:update",
    "folder:delete",
    "tag:read",
    "tag:create",
    "tag:update",
    "tag:delete",
    "integration:read",
    "integration:manage",
    "credential:read",
    "credential:manage",
    "billing:read",
    "billing:manage",
    "api_key:read",
    "api_key:manage",
    "audit_log:read",
  ],
  ADMIN: [
    "workspace:read",
    "workspace:update",
    "member:read",
    "member:invite",
    "member:update",
    "workflow:read",
    "workflow:create",
    "workflow:update",
    "workflow:delete",
    "workflow:run",
    "workflow:publish",
    "workflow:archive",
    "folder:read",
    "folder:create",
    "folder:update",
    "folder:delete",
    "tag:read",
    "tag:create",
    "tag:update",
    "tag:delete",
    "integration:read",
    "integration:manage",
    "credential:read",
    "credential:manage",
    "api_key:read",
    "api_key:manage",
    "audit_log:read",
  ],
  MEMBER: [
    "workspace:read",
    "workflow:read",
    "workflow:create",
    "workflow:update",
    "workflow:run",
    "folder:read",
    "tag:read",
    "integration:read",
    "credential:read",
  ],
  VIEWER: ["workspace:read", "workflow:read", "folder:read", "tag:read", "integration:read", "billing:read"],
};
