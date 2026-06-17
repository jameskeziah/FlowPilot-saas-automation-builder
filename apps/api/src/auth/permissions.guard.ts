import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthRequest } from "./auth-request";
import type { Permission } from "./permissions";
import { REQUIRED_PERMISSIONS_KEY } from "./require-permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();

    if (!request.auth) {
      throw new ForbiddenException("Missing auth context.");
    }

    const allowed = requiredPermissions.every((permission) =>
      request.auth.permissions.includes(permission)
    );

    if (!allowed) {
      throw new ForbiddenException("You do not have permission to perform this action.");
    }

    return true;
  }
}
