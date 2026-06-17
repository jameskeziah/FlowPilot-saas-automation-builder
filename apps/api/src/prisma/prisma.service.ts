import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { prisma } from "@flowpilot/database";

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client = prisma;

  get user() {
    return this.client.user;
  }

  get workspace() {
    return this.client.workspace;
  }

  get workspaceMember() {
    return this.client.workspaceMember;
  }

  get workflow() {
    return this.client.workflow;
  }

  get workflowVersion() {
    return this.client.workflowVersion;
  }

  get workflowNode() {
    return this.client.workflowNode;
  }

  get workflowEdge() {
    return this.client.workflowEdge;
  }

  get workflowRun() {
    return this.client.workflowRun;
  }

  get workflowStepRun() {
    return this.client.workflowStepRun;
  }

  get folder() {
    return this.client.folder;
  }

  get tag() {
    return this.client.tag;
  }

  get workflowTag() {
    return this.client.workflowTag;
  }

  get executionLog() {
    return this.client.executionLog;
  }

  get credentialVault() {
    return this.client.credentialVault;
  }

  get auditLog() {
    return this.client.auditLog;
  }

  $transaction: typeof prisma.$transaction = this.client.$transaction.bind(this.client);

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
