import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@flowpilot/database";

export type WebAuthContext = {
  clerkUserId: string;
  currentUserId: string;
  currentWorkspaceId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  permissions: string[];
};

const rolePermissions: Record<WebAuthContext["role"], string[]> = {
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

export function can(authContext: WebAuthContext, permission: string) {
  return authContext.permissions.includes(permission);
}

export function requireWebPermission(authContext: WebAuthContext, permission: string) {
  if (!can(authContext, permission)) {
    throw new Error("You do not have permission to perform this action.");
  }
}

export async function getWebAuthContext(request?: Request): Promise<WebAuthContext> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    const clerkUser = await currentUser();
    const email =
      clerkUser?.primaryEmailAddress?.emailAddress ??
      clerkUser?.emailAddresses[0]?.emailAddress;

    if (!email) {
      throw new Error("Clerk user does not have an email address.");
    }

    const name =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
      email.split("@")[0];

    user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          clerkId: userId,
          email,
          name,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `${name}'s Workspace`,
          slug: `workspace-${userId.slice(-8).toLowerCase()}`,
          createdById: createdUser.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: createdUser.id,
          role: "OWNER",
        },
      });

      return createdUser;
    });
  }

  const requestedWorkspaceId = request?.headers.get("x-workspace-id") ?? undefined;
  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (memberships.length === 0) {
    const workspace = await prisma.workspace.create({
      data: {
        name: "My Workspace",
        slug: `workspace-${user.id.slice(-8).toLowerCase()}`,
        createdById: user.id,
      },
    });

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    return {
      clerkUserId: userId,
      currentUserId: user.id,
      currentWorkspaceId: workspace.id,
      role: member.role,
      permissions: rolePermissions[member.role],
    };
  }

  const selectedMembership = requestedWorkspaceId
    ? memberships.find((membership) => membership.workspaceId === requestedWorkspaceId)
    : memberships[0];

  if (!selectedMembership) {
    throw new Error("You do not belong to this workspace.");
  }

  return {
    clerkUserId: userId,
    currentUserId: user.id,
    currentWorkspaceId: selectedMembership.workspaceId,
    role: selectedMembership.role,
    permissions: rolePermissions[selectedMembership.role],
  };
}
