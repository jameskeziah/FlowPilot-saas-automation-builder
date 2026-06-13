-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowStepRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NodeCategory" AS ENUM ('TRIGGER', 'CONDITION', 'AI', 'ACTION', 'DELAY', 'CRM', 'COMMUNICATION', 'PAYMENT', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "CredentialVaultStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "activeVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowVersion" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "WorkflowVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "definition" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowNode" (
    "id" TEXT NOT NULL,
    "workflowVersionId" TEXT NOT NULL,
    "nodeKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "credentialKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowEdge" (
    "id" TEXT NOT NULL,
    "workflowVersionId" TEXT NOT NULL,
    "edgeKey" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "sourceHandle" TEXT,
    "targetHandle" TEXT,
    "condition" JSONB,

    CONSTRAINT "WorkflowEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "workflowVersionId" TEXT,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'QUEUED',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStepRun" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "workflowNodeId" TEXT,
    "nodeKey" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "status" "WorkflowStepRunStatus" NOT NULL DEFAULT 'QUEUED',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowStepRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeRegistry" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "NodeCategory" NOT NULL,
    "provider" TEXT,
    "description" TEXT,
    "inputSchema" JSONB,
    "outputSchema" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeHandler" (
    "id" TEXT NOT NULL,
    "nodeRegistryId" TEXT NOT NULL,
    "runtime" TEXT NOT NULL,
    "handlerKey" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionLog" (
    "id" TEXT NOT NULL,
    "workflowRunId" TEXT NOT NULL,
    "workflowStepRunId" TEXT,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationAccount" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialVault" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "integrationAccountId" TEXT,
    "provider" TEXT NOT NULL,
    "credentialKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "CredentialVaultStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredentialVault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriggerEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriggerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_userId_workspaceId_key" ON "WorkspaceMember"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_activeVersionId_key" ON "Workflow"("activeVersionId");

-- CreateIndex
CREATE INDEX "Workflow_workspaceId_status_idx" ON "Workflow"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "WorkflowVersion_workflowId_status_idx" ON "WorkflowVersion"("workflowId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowVersion_workflowId_version_key" ON "WorkflowVersion"("workflowId", "version");

-- CreateIndex
CREATE INDEX "WorkflowNode_workflowVersionId_type_idx" ON "WorkflowNode"("workflowVersionId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowNode_workflowVersionId_nodeKey_key" ON "WorkflowNode"("workflowVersionId", "nodeKey");

-- CreateIndex
CREATE INDEX "WorkflowEdge_sourceNodeId_idx" ON "WorkflowEdge"("sourceNodeId");

-- CreateIndex
CREATE INDEX "WorkflowEdge_targetNodeId_idx" ON "WorkflowEdge"("targetNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowEdge_workflowVersionId_edgeKey_key" ON "WorkflowEdge"("workflowVersionId", "edgeKey");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_createdAt_idx" ON "WorkflowRun"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowVersionId_idx" ON "WorkflowRun"("workflowVersionId");

-- CreateIndex
CREATE INDEX "WorkflowRun_status_idx" ON "WorkflowRun"("status");

-- CreateIndex
CREATE INDEX "WorkflowStepRun_workflowRunId_idx" ON "WorkflowStepRun"("workflowRunId");

-- CreateIndex
CREATE INDEX "WorkflowStepRun_workflowNodeId_idx" ON "WorkflowStepRun"("workflowNodeId");

-- CreateIndex
CREATE INDEX "WorkflowStepRun_nodeType_idx" ON "WorkflowStepRun"("nodeType");

-- CreateIndex
CREATE INDEX "WorkflowStepRun_status_idx" ON "WorkflowStepRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "NodeRegistry_type_key" ON "NodeRegistry"("type");

-- CreateIndex
CREATE INDEX "NodeHandler_runtime_enabled_idx" ON "NodeHandler"("runtime", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "NodeHandler_nodeRegistryId_handlerKey_version_key" ON "NodeHandler"("nodeRegistryId", "handlerKey", "version");

-- CreateIndex
CREATE INDEX "ExecutionLog_workflowRunId_createdAt_idx" ON "ExecutionLog"("workflowRunId", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutionLog_workflowStepRunId_createdAt_idx" ON "ExecutionLog"("workflowStepRunId", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutionLog_level_idx" ON "ExecutionLog"("level");

-- CreateIndex
CREATE INDEX "IntegrationAccount_workspaceId_provider_idx" ON "IntegrationAccount"("workspaceId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationAccount_workspaceId_provider_accountKey_key" ON "IntegrationAccount"("workspaceId", "provider", "accountKey");

-- CreateIndex
CREATE INDEX "CredentialVault_workspaceId_provider_idx" ON "CredentialVault"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "CredentialVault_integrationAccountId_idx" ON "CredentialVault"("integrationAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CredentialVault_workspaceId_credentialKey_key" ON "CredentialVault"("workspaceId", "credentialKey");

-- CreateIndex
CREATE INDEX "TriggerEvent_workspaceId_source_idx" ON "TriggerEvent"("workspaceId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "TriggerEvent_source_externalId_key" ON "TriggerEvent"("source", "externalId");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowNode" ADD CONSTRAINT "WorkflowNode_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "WorkflowNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "WorkflowVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepRun" ADD CONSTRAINT "WorkflowStepRun_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStepRun" ADD CONSTRAINT "WorkflowStepRun_workflowNodeId_fkey" FOREIGN KEY ("workflowNodeId") REFERENCES "WorkflowNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeHandler" ADD CONSTRAINT "NodeHandler_nodeRegistryId_fkey" FOREIGN KEY ("nodeRegistryId") REFERENCES "NodeRegistry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_workflowStepRunId_fkey" FOREIGN KEY ("workflowStepRunId") REFERENCES "WorkflowStepRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationAccount" ADD CONSTRAINT "IntegrationAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialVault" ADD CONSTRAINT "CredentialVault_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialVault" ADD CONSTRAINT "CredentialVault_integrationAccountId_fkey" FOREIGN KEY ("integrationAccountId") REFERENCES "IntegrationAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriggerEvent" ADD CONSTRAINT "TriggerEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
