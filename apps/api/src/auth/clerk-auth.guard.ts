import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { verifyToken } from "@clerk/backend";
import { apiEnv } from "@flowpilot/env/api";
import { AuthContextService } from "./auth-context.service";
import type { AuthRequest } from "./auth-request";

function getAuthorizationHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly authContextService: AuthContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const authorization = getAuthorizationHeader(request.headers.authorization);

    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing authorization token.");
    }

    if (!apiEnv.CLERK_SECRET_KEY) {
      throw new UnauthorizedException("CLERK_SECRET_KEY is not configured.");
    }

    const token = authorization.replace("Bearer ", "");
    let payload: Awaited<ReturnType<typeof verifyToken>>;

    try {
      payload = await verifyToken(token, {
        secretKey: apiEnv.CLERK_SECRET_KEY,
      });
    } catch {
      throw new UnauthorizedException("Invalid Clerk token.");
    }

    const clerkUserId = payload.sub;

    if (!clerkUserId) {
      throw new UnauthorizedException("Invalid Clerk user.");
    }

    const requestedWorkspaceId = request.headers["x-workspace-id"];

    request.auth = await this.authContextService.resolve(
      clerkUserId,
      typeof requestedWorkspaceId === "string" ? requestedWorkspaceId : undefined
    );

    return true;
  }
}
