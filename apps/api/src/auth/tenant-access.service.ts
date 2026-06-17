import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthContext } from "./auth-context";

@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireWorkflow(auth: AuthContext, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
      },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found.");
    }

    return workflow;
  }

  async requireWorkflowVersion(auth: AuthContext, versionId: string) {
    const version = await this.prisma.workflowVersion.findFirst({
      where: {
        id: versionId,
        workspaceId: auth.currentWorkspaceId,
      },
    });

    if (!version) {
      throw new NotFoundException("Workflow version not found.");
    }

    return version;
  }

  async requireCredential(auth: AuthContext, credentialId: string) {
    const credential = await this.prisma.credentialVault.findFirst({
      where: {
        id: credentialId,
        workspaceId: auth.currentWorkspaceId,
      },
    });

    if (!credential) {
      throw new NotFoundException("Credential not found.");
    }

    return credential;
  }
}
