import { ForbiddenException, Injectable } from "@nestjs/common";
import { createClerkClient } from "@clerk/backend";
import { apiEnv } from "@flowpilot/env/api";
import { PrismaService } from "../prisma/prisma.service";
import { rolePermissions } from "./permissions";

@Injectable()
export class AuthContextService {
  private readonly clerk = createClerkClient({
    secretKey: apiEnv.CLERK_SECRET_KEY,
  });

  constructor(private readonly prisma: PrismaService) {}

  async resolve(clerkUserId: string, requestedWorkspaceId?: string) {
    let user = await this.prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      const clerkUser = await this.clerk.users.getUser(clerkUserId);
      const email =
        clerkUser.primaryEmailAddress?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress;

      if (!email) {
        throw new ForbiddenException("Clerk user does not have an email address.");
      }

      const name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        email.split("@")[0];

      user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            clerkId: clerkUserId,
            email,
            name,
          },
        });

        const workspace = await tx.workspace.create({
          data: {
            name: `${name}'s Workspace`,
            slug: `workspace-${clerkUserId.slice(-8).toLowerCase()}`,
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

    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      include: {
        workspace: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (memberships.length === 0) {
      const workspace = await this.prisma.workspace.create({
        data: {
          name: "My Workspace",
          slug: `workspace-${user.id.slice(-8).toLowerCase()}`,
          createdById: user.id,
        },
      });

      const member = await this.prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return {
        clerkUserId,
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
      throw new ForbiddenException("You do not belong to this workspace.");
    }

    return {
      clerkUserId,
      currentUserId: user.id,
      currentWorkspaceId: selectedMembership.workspaceId,
      role: selectedMembership.role,
      permissions: rolePermissions[selectedMembership.role],
    };
  }
}
