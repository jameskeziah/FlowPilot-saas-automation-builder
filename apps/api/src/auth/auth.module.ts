import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthContextService } from "./auth-context.service";
import { ClerkAuthGuard } from "./clerk-auth.guard";
import { PermissionsGuard } from "./permissions.guard";
import { TenantAccessService } from "./tenant-access.service";

@Module({
  imports: [PrismaModule],
  providers: [
    AuthContextService,
    ClerkAuthGuard,
    PermissionsGuard,
    TenantAccessService,
  ],
  exports: [AuthContextService, ClerkAuthGuard, PermissionsGuard, TenantAccessService],
})
export class AuthModule {}
