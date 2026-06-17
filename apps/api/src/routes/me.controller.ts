import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import type { AuthRequest } from "../auth/auth-request";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";

@Controller("me")
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class MeController {
  @Get()
  @RequirePermissions("workspace:read")
  async me(@Req() request: AuthRequest) {
    return {
      currentUserId: request.auth.currentUserId,
      currentWorkspaceId: request.auth.currentWorkspaceId,
      role: request.auth.role,
      permissions: request.auth.permissions,
    };
  }
}
