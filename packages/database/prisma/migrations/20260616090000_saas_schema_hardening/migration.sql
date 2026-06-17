-- CreateEnum
ALTER TYPE "WorkspaceRole" ADD VALUE IF NOT EXISTS 'VIEWER';

-- CreateEnum
CREATE TYPE "WorkspaceInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'INVITE_SENT', 'INVITE_ACCEPTED', 'WORKFLOW_RUN', 'WORKFLOW_PUBLISH', 'WORKFLOW_ARCHIVE', 'API_KEY_CREATED', 'API_KEY_REVOKED', 'CREDENTIAL_CREATED', 'CREDENTIAL_REVOKED', 'SUBSCRIPTION_UPDATED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "UsageMetric" AS ENUM ('WORKFLOW_RUN', 'STEP_RUN', 'AI_TOKENS', 'WEBHOOK_CALL', 'API_CALL', 'STORAGE_MB', 'INTEGRATION_CALL');

-- CreateEnum
CREATE TYPE "FolderStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TagStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WebhookSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'REVOKED');

-- CreateEnum
CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR');

-- Harden workflow ownership and soft-delete metadata
ALTER TABLE "Workspace" ADD COLUMN "createdById" TEXT;
ALTER TABLE "WorkspaceMember" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Workflow" ADD COLUMN "folderId" TEXT;
ALTER TABLE "Workflow" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Workflow" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Workflow" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Workflow" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Denormalize workspaceId onto workflow graph tables
ALTER TABLE "WorkflowVersion" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "WorkflowVersion" ADD COLUMN "createdById" TEXT;
ALTER TABLE "WorkflowVersion" RENAME COLUMN "version" TO "versionNumber";
ALTER TABLE "WorkflowVersion" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "WorkflowVersion" ADD COLUMN "deletedAt" TIMESTAMP(3);
UPDATE "WorkflowVersion"
SET "workspaceId" = "Workflow"."workspaceId"
FROM "Workflow"
WHERE "WorkflowVersion"."workflowId" = "Workflow"."id";
ALTER TABLE "WorkflowVersion" ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "WorkflowNode" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "WorkflowNode" ADD COLUMN "deletedAt" TIMESTAMP(3);
UPDATE "WorkflowNode"
SET "workspaceId" = "WorkflowVersion"."workspaceId"
FROM "WorkflowVersion"
WHERE "WorkflowNode"."workflowVersionId" = "WorkflowVersion"."id";
ALTER TABLE "WorkflowNode" ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "WorkflowEdge" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "WorkflowEdge" ADD COLUMN "deletedAt" TIMESTAMP(3);
UPDATE "WorkflowEdge"
SET "workspaceId" = "WorkflowVersion"."workspaceId"
FROM "WorkflowVersion"
WHERE "WorkflowEdge"."workflowVersionId" = "WorkflowVersion"."id";
ALTER TABLE "WorkflowEdge" ALTER COLUMN "workspaceId" SET NOT NULL;

-- Denormalize workspaceId onto runtime records
ALTER TABLE "WorkflowRun" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "WorkflowRun" ADD COLUMN "startedById" TEXT;
ALTER TABLE "WorkflowRun" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "WorkflowRun" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WorkflowRun" ALTER COLUMN "error" TYPE JSONB USING CASE WHEN "error" IS NULL THEN NULL ELSE jsonb_build_object('message', "error") END;
UPDATE "WorkflowRun"
SET "workspaceId" = "Workflow"."workspaceId"
FROM "Workflow"
WHERE "WorkflowRun"."workflowId" = "Workflow"."id";
ALTER TABLE "WorkflowRun" ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "WorkflowStepRun" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "WorkflowStepRun" RENAME COLUMN "workflowNodeId" TO "nodeId";
ALTER TABLE "WorkflowStepRun" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WorkflowStepRun" ALTER COLUMN "error" TYPE JSONB USING CASE WHEN "error" IS NULL THEN NULL ELSE jsonb_build_object('message', "error") END;
UPDATE "WorkflowStepRun"
SET "workspaceId" = "WorkflowRun"."workspaceId"
FROM "WorkflowRun"
WHERE "WorkflowStepRun"."workflowRunId" = "WorkflowRun"."id";
ALTER TABLE "WorkflowStepRun" ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "ExecutionLog" ADD COLUMN "workspaceId" TEXT;
UPDATE "ExecutionLog"
SET "workspaceId" = "WorkflowRun"."workspaceId"
FROM "WorkflowRun"
WHERE "ExecutionLog"."workflowRunId" = "WorkflowRun"."id";
ALTER TABLE "ExecutionLog" ALTER COLUMN "workspaceId" SET NOT NULL;

-- Harden existing integration table
ALTER TABLE "IntegrationAccount" ADD COLUMN "createdById" TEXT;
ALTER TABLE "IntegrationAccount" ADD COLUMN "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "IntegrationAccount" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "FolderStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "status" "TagStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTag" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "status" "WorkspaceInviteStatus" NOT NULL DEFAULT 'PENDING',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT,
    "acceptedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "revokedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "planCode" TEXT NOT NULL,
    "provider" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "metric" "UsageMetric" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "workflowId" TEXT,
    "runId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "defaultTimezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "allowApiKeys" BOOLEAN NOT NULL DEFAULT true,
    "allowWebhooks" BOOLEAN NOT NULL DEFAULT true,
    "allowInvites" BOOLEAN NOT NULL DEFAULT true,
    "planLimits" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secretHash" TEXT,
    "events" TEXT[],
    "status" "WebhookSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountName" TEXT,
    "accountId" TEXT,
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "credentialId" TEXT,
    "scopes" TEXT[],
    "metadata" JSONB,
    "connectedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- Indexes: workflow ownership and graph
CREATE INDEX "Workspace_createdById_idx" ON "Workspace"("createdById");
CREATE INDEX "WorkspaceMember_userId_deletedAt_idx" ON "WorkspaceMember"("userId", "deletedAt");
CREATE INDEX "Workflow_workspaceId_idx" ON "Workflow"("workspaceId");
CREATE INDEX "Workflow_workspaceId_folderId_idx" ON "Workflow"("workspaceId", "folderId");
CREATE INDEX "Workflow_workspaceId_deletedAt_idx" ON "Workflow"("workspaceId", "deletedAt");
CREATE INDEX "Workflow_createdById_idx" ON "Workflow"("createdById");
CREATE UNIQUE INDEX "Workflow_workspaceId_name_key" ON "Workflow"("workspaceId", "name");
CREATE INDEX "WorkflowVersion_workspaceId_idx" ON "WorkflowVersion"("workspaceId");
CREATE INDEX "WorkflowVersion_workspaceId_status_idx" ON "WorkflowVersion"("workspaceId", "status");
CREATE INDEX "WorkflowVersion_workflowId_idx" ON "WorkflowVersion"("workflowId");
CREATE INDEX "WorkflowNode_workspaceId_type_idx" ON "WorkflowNode"("workspaceId", "type");
CREATE INDEX "WorkflowNode_workspaceId_deletedAt_idx" ON "WorkflowNode"("workspaceId", "deletedAt");
CREATE INDEX "WorkflowEdge_workspaceId_idx" ON "WorkflowEdge"("workspaceId");
CREATE INDEX "WorkflowEdge_workspaceId_deletedAt_idx" ON "WorkflowEdge"("workspaceId", "deletedAt");

-- Indexes: runtime tenant isolation
CREATE INDEX "WorkflowRun_workspaceId_idx" ON "WorkflowRun"("workspaceId");
CREATE INDEX "WorkflowRun_workspaceId_createdAt_idx" ON "WorkflowRun"("workspaceId", "createdAt");
CREATE INDEX "WorkflowRun_workspaceId_status_idx" ON "WorkflowRun"("workspaceId", "status");
CREATE INDEX "WorkflowRun_workflowId_idx" ON "WorkflowRun"("workflowId");
CREATE INDEX "WorkflowStepRun_workspaceId_idx" ON "WorkflowStepRun"("workspaceId");
CREATE INDEX "WorkflowStepRun_workspaceId_status_idx" ON "WorkflowStepRun"("workspaceId", "status");
CREATE INDEX "WorkflowStepRun_nodeId_idx" ON "WorkflowStepRun"("nodeId");
CREATE INDEX "ExecutionLog_workspaceId_createdAt_idx" ON "ExecutionLog"("workspaceId", "createdAt");
CREATE INDEX "ExecutionLog_workspaceId_level_createdAt_idx" ON "ExecutionLog"("workspaceId", "level", "createdAt");

-- Indexes: folders/tags
CREATE INDEX "Folder_workspaceId_idx" ON "Folder"("workspaceId");
CREATE INDEX "Folder_workspaceId_status_idx" ON "Folder"("workspaceId", "status");
CREATE INDEX "Folder_workspaceId_deletedAt_idx" ON "Folder"("workspaceId", "deletedAt");
CREATE UNIQUE INDEX "Folder_workspaceId_name_key" ON "Folder"("workspaceId", "name");
CREATE UNIQUE INDEX "Tag_workspaceId_name_key" ON "Tag"("workspaceId", "name");
CREATE INDEX "Tag_workspaceId_idx" ON "Tag"("workspaceId");
CREATE INDEX "Tag_workspaceId_status_idx" ON "Tag"("workspaceId", "status");
CREATE UNIQUE INDEX "WorkflowTag_workflowId_tagId_key" ON "WorkflowTag"("workflowId", "tagId");
CREATE INDEX "WorkflowTag_workspaceId_idx" ON "WorkflowTag"("workspaceId");
CREATE INDEX "WorkflowTag_workflowId_idx" ON "WorkflowTag"("workflowId");
CREATE INDEX "WorkflowTag_tagId_idx" ON "WorkflowTag"("tagId");

-- Indexes: SaaS infrastructure
CREATE UNIQUE INDEX "WorkspaceInvite_tokenHash_key" ON "WorkspaceInvite"("tokenHash");
CREATE UNIQUE INDEX "WorkspaceInvite_workspaceId_email_status_key" ON "WorkspaceInvite"("workspaceId", "email", "status");
CREATE INDEX "WorkspaceInvite_workspaceId_idx" ON "WorkspaceInvite"("workspaceId");
CREATE INDEX "WorkspaceInvite_email_idx" ON "WorkspaceInvite"("email");
CREATE INDEX "WorkspaceInvite_status_idx" ON "WorkspaceInvite"("status");
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_workspaceId_idx" ON "ApiKey"("workspaceId");
CREATE INDEX "ApiKey_workspaceId_status_idx" ON "ApiKey"("workspaceId", "status");
CREATE INDEX "ApiKey_prefix_idx" ON "ApiKey"("prefix");
CREATE INDEX "AuditLog_workspaceId_idx" ON "AuditLog"("workspaceId");
CREATE INDEX "AuditLog_workspaceId_action_idx" ON "AuditLog"("workspaceId", "action");
CREATE INDEX "AuditLog_workspaceId_entityType_entityId_idx" ON "AuditLog"("workspaceId", "entityType", "entityId");
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");
CREATE INDEX "Subscription_workspaceId_idx" ON "Subscription"("workspaceId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_providerCustomerId_idx" ON "Subscription"("providerCustomerId");
CREATE INDEX "Subscription_providerSubscriptionId_idx" ON "Subscription"("providerSubscriptionId");
CREATE INDEX "UsageRecord_workspaceId_idx" ON "UsageRecord"("workspaceId");
CREATE INDEX "UsageRecord_workspaceId_metric_idx" ON "UsageRecord"("workspaceId", "metric");
CREATE INDEX "UsageRecord_workspaceId_occurredAt_idx" ON "UsageRecord"("workspaceId", "occurredAt");
CREATE INDEX "UsageRecord_workflowId_idx" ON "UsageRecord"("workflowId");
CREATE INDEX "UsageRecord_runId_idx" ON "UsageRecord"("runId");
CREATE UNIQUE INDEX "WorkspaceSettings_workspaceId_key" ON "WorkspaceSettings"("workspaceId");
CREATE INDEX "WebhookSubscription_workspaceId_idx" ON "WebhookSubscription"("workspaceId");
CREATE INDEX "WebhookSubscription_workspaceId_status_idx" ON "WebhookSubscription"("workspaceId", "status");
CREATE INDEX "IntegrationConnection_workspaceId_idx" ON "IntegrationConnection"("workspaceId");
CREATE INDEX "IntegrationConnection_workspaceId_provider_idx" ON "IntegrationConnection"("workspaceId", "provider");
CREATE INDEX "IntegrationConnection_workspaceId_status_idx" ON "IntegrationConnection"("workspaceId", "status");
CREATE UNIQUE INDEX "IntegrationConnection_workspaceId_provider_accountId_key" ON "IntegrationConnection"("workspaceId", "provider", "accountId");
CREATE INDEX "IntegrationAccount_workspaceId_status_idx" ON "IntegrationAccount"("workspaceId", "status");
CREATE INDEX "IntegrationAccount_workspaceId_deletedAt_idx" ON "IntegrationAccount"("workspaceId", "deletedAt");

-- Foreign keys: workflow graph
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowVersion" ADD CONSTRAINT "WorkflowVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowNode" ADD CONSTRAINT "WorkflowNode_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys: runtime
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowStepRun" ADD CONSTRAINT "WorkflowStepRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExecutionLog" ADD CONSTRAINT "ExecutionLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys: folders/tags
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowTag" ADD CONSTRAINT "WorkflowTag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowTag" ADD CONSTRAINT "WorkflowTag_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowTag" ADD CONSTRAINT "WorkflowTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign keys: SaaS infrastructure
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WorkflowRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkspaceSettings" ADD CONSTRAINT "WorkspaceSettings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookSubscription" ADD CONSTRAINT "WebhookSubscription_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "CredentialVault"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
