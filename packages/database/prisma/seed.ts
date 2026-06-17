import { config } from "dotenv";
import type { Prisma } from "../src/index";

config({ path: "../../.env" });
config({ path: ".env" });

const { prisma } = await import("../src/index");

const nodeDefinitions = [
  {
    type: "manual.trigger",
    label: "Manual Trigger",
    category: "TRIGGER" as const,
    description: "Starts a workflow manually from the API or dashboard.",
    inputSchema: {
      type: "object",
      properties: {
        triggerName: { type: "string" },
        sampleInput: { type: "string" },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        received: { type: "object" },
        triggeredAt: { type: "string" },
      },
    },
  },
  {
    type: "logic.delay",
    label: "Delay",
    category: "DELAY" as const,
    description: "Pauses a workflow before the next node.",
    inputSchema: {
      type: "object",
      properties: {
        durationValue: { type: "number" },
        durationUnit: { enum: ["seconds", "minutes"] },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        delayed: { type: "boolean" },
        appliedMs: { type: "number" },
      },
    },
  },
  {
    type: "debug.log",
    label: "Debug Log",
    category: "ACTION" as const,
    description: "Writes workflow data to execution logs for debugging.",
    inputSchema: {
      type: "object",
      properties: {
        bodySelector: { enum: ["input", "previousOutput", "custom"] },
        message: { type: "string" },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        logged: { type: "boolean" },
        message: { type: "string" },
      },
    },
  },
];

const definition = {
  nodes: [
    {
      id: "trigger-1",
      type: "manual.trigger",
      position: { x: 80, y: 120 },
      data: {
        triggerName: "Manual run",
        sampleInput: "{\"source\":\"manual\"}",
      },
    },
    {
      id: "delay-1",
      type: "logic.delay",
      position: { x: 360, y: 120 },
      data: {
        durationValue: 1,
        durationUnit: "seconds",
        durationMs: 1000,
      },
    },
    {
      id: "log-1",
      type: "debug.log",
      position: { x: 640, y: 120 },
      data: {
        bodySelector: "input",
        message: "Seeded workflow completed",
      },
    },
  ],
  edges: [
    {
      id: "edge-trigger-delay",
      source: "trigger-1",
      target: "delay-1",
    },
    {
      id: "edge-delay-log",
      source: "delay-1",
      target: "log-1",
    },
  ],
};

const toJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

async function seedNodeRegistry() {
  for (const node of nodeDefinitions) {
    const registry = await prisma.nodeRegistry.upsert({
      where: { type: node.type },
      update: {
        label: node.label,
        category: node.category,
        description: node.description,
        inputSchema: toJson(node.inputSchema),
        outputSchema: toJson(node.outputSchema),
        enabled: true,
      },
      create: {
        type: node.type,
        label: node.label,
        category: node.category,
        description: node.description,
        inputSchema: toJson(node.inputSchema),
        outputSchema: toJson(node.outputSchema),
        enabled: true,
      },
    });

    await prisma.nodeHandler.upsert({
      where: {
        nodeRegistryId_handlerKey_version: {
          nodeRegistryId: registry.id,
          handlerKey: node.type,
          version: "1",
        },
      },
      update: {
        runtime: "node",
        enabled: true,
        metadata: toJson({ package: "@flowpilot/nodes" }),
      },
      create: {
        nodeRegistryId: registry.id,
        runtime: "node",
        handlerKey: node.type,
        version: "1",
        enabled: true,
        metadata: toJson({ package: "@flowpilot/nodes" }),
      },
    });
  }
}

async function seedDemoWorkflow() {
  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.upsert({
    where: { email: "demo@flowpilot.local" },
    update: {
      name: "Demo User",
    },
    create: {
      email: "demo@flowpilot.local",
      name: "Demo User",
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-workspace" },
    update: {
      name: "Demo Workspace",
      createdById: user.id,
    },
    create: {
      name: "Demo Workspace",
      slug: "demo-workspace",
      createdById: user.id,
    },
  });

  const memberSeeds = [
    { email: "demo@flowpilot.local", name: "Demo User", role: "OWNER" as const },
    { email: "admin@flowpilot.local", name: "Demo Admin", role: "ADMIN" as const },
    { email: "member@flowpilot.local", name: "Demo Member", role: "MEMBER" as const },
    { email: "viewer@flowpilot.local", name: "Demo Viewer", role: "VIEWER" as const },
  ];

  const users = new Map<string, typeof user>();
  for (const member of memberSeeds) {
    const seededUser = await prisma.user.upsert({
      where: { email: member.email },
      update: { name: member.name },
      create: { email: member.email, name: member.name },
    });
    users.set(member.email, seededUser);

    await prisma.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: seededUser.id,
          workspaceId: workspace.id,
        },
      },
      update: { role: member.role },
      create: {
        userId: seededUser.id,
        workspaceId: workspace.id,
        role: member.role,
      },
    });
  }

  const folderSeeds = [
    ["Sales Automation", "Lead capture and follow-up workflows."],
    ["Student CRM", "Education CRM automation examples."],
    ["Marketing", "Campaign and nurture automation."],
    ["Internal Ops", "Back-office workflow examples."],
    ["Archived Samples", "Soft-deleted and archived seed data."],
  ] as const;

  const folders = new Map<string, { id: string }>();
  for (const [name, description] of folderSeeds) {
    const folder = await prisma.folder.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name } },
      update: { description, status: name === "Archived Samples" ? "ARCHIVED" : "ACTIVE" },
      create: {
        workspaceId: workspace.id,
        createdById: user.id,
        name,
        description,
        status: name === "Archived Samples" ? "ARCHIVED" : "ACTIVE",
        deletedAt: name === "Archived Samples" ? lastWeek : null,
      },
    });
    folders.set(name, folder);
  }

  const tagSeeds = [
    ["lead-capture", "#2f6f73"],
    ["whatsapp", "#20b15a"],
    ["crm", "#2563eb"],
    ["ai", "#7c3aed"],
    ["billing", "#c2410c"],
    ["demo", "#475569"],
  ] as const;

  const tags = new Map<string, { id: string }>();
  for (const [name, color] of tagSeeds) {
    const tag = await prisma.tag.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name } },
      update: { status: "ACTIVE", color },
      create: {
        workspaceId: workspace.id,
        createdById: user.id,
        name,
        color,
      },
    });
    tags.set(name, tag);
  }

  for (const invite of [
    { email: "pending-admin@example.com", role: "ADMIN" as const },
    { email: "pending-viewer@example.com", role: "VIEWER" as const },
  ]) {
    const existing = await prisma.workspaceInvite.findFirst({
      where: { workspaceId: workspace.id, email: invite.email, status: "PENDING" },
    });
    if (!existing) {
      await prisma.workspaceInvite.create({
        data: {
          workspaceId: workspace.id,
          email: invite.email,
          role: invite.role,
          tokenHash: `demo_invite_hash_${invite.role.toLowerCase()}`,
          invitedById: user.id,
          expiresAt: nextMonth,
        },
      });
    }
  }

  await prisma.subscription.upsert({
    where: {
      workspaceId: workspace.id,
    },
    update: {
      status: "ACTIVE",
      planCode: "PRO",
      provider: "manual",
      currentPeriodStart: lastWeek,
      currentPeriodEnd: nextMonth,
    },
    create: {
      workspaceId: workspace.id,
      provider: "manual",
      status: "ACTIVE",
      planCode: "PRO",
      currentPeriodStart: lastWeek,
      currentPeriodEnd: nextMonth,
    },
  });

  await prisma.workspaceSettings.upsert({
    where: {
      workspaceId: workspace.id,
    },
    update: {
      retentionDays: 90,
      planLimits: toJson({
        workflowRuns: 1000,
        aiTokens: 100000,
        webhookCalls: 5000,
        apiCalls: 10000,
      }),
      metadata: toJson({ workflowRunMode: "direct", seeded: true }),
    },
    create: {
      workspaceId: workspace.id,
      retentionDays: 90,
      planLimits: toJson({
        workflowRuns: 1000,
        aiTokens: 100000,
        webhookCalls: 5000,
        apiCalls: 10000,
      }),
      metadata: toJson({ workflowRunMode: "direct", seeded: true }),
    },
  });

  const createWorkflowVersion = async (
    workflowId: string,
    versionNumber: number,
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
    options: { publishedAt?: Date; archivedAt?: Date; deletedAt?: Date; notes?: string } = {}
  ) => {
    const version = await prisma.workflowVersion.upsert({
      where: { workflowId_versionNumber: { workflowId, versionNumber } },
      update: {
        status,
        publishedAt: options.publishedAt,
        archivedAt: options.archivedAt,
        deletedAt: options.deletedAt,
        definition: toJson(definition),
        notes: options.notes,
      },
      create: {
        workspaceId: workspace.id,
        workflowId,
        versionNumber,
        status,
        publishedAt: options.publishedAt,
        archivedAt: options.archivedAt,
        deletedAt: options.deletedAt,
        definition: toJson(definition),
        notes: options.notes,
      },
    });

    const nodeIdMap = new Map<string, string>();
    for (const node of definition.nodes) {
      const createdNode = await prisma.workflowNode.upsert({
        where: { workflowVersionId_nodeKey: { workflowVersionId: version.id, nodeKey: node.id } },
        update: {
          type: node.type,
          label: node.type,
          positionX: node.position.x,
          positionY: node.position.y,
          config: toJson(node.data),
        },
        create: {
          workspaceId: workspace.id,
          workflowVersionId: version.id,
          nodeKey: node.id,
          type: node.type,
          label: node.type,
          positionX: node.position.x,
          positionY: node.position.y,
          config: toJson(node.data),
        },
      });
      nodeIdMap.set(node.id, createdNode.id);
    }

    for (const edge of definition.edges) {
      const sourceNodeId = nodeIdMap.get(edge.source);
      const targetNodeId = nodeIdMap.get(edge.target);
      if (!sourceNodeId || !targetNodeId) continue;

      await prisma.workflowEdge.upsert({
        where: { workflowVersionId_edgeKey: { workflowVersionId: version.id, edgeKey: edge.id } },
        update: { sourceNodeId, targetNodeId },
        create: {
          workspaceId: workspace.id,
          workflowVersionId: version.id,
          edgeKey: edge.id,
          sourceNodeId,
          targetNodeId,
        },
      });
    }

    return version;
  };

  const workflowSeeds = [
    {
      name: "New Lead Follow-up Workflow",
      description: "Manual lead capture to delay to debug log.",
      status: "ACTIVE" as const,
      folder: "Sales Automation",
      tagNames: ["lead-capture", "whatsapp", "crm", "demo"],
      versions: [{ number: 1, status: "PUBLISHED" as const, publishedAt: lastWeek }],
    },
    {
      name: "Demo AI Email Workflow",
      description: "Draft AI email workflow for editor testing.",
      status: "DRAFT" as const,
      folder: "Marketing",
      tagNames: ["ai", "demo"],
      versions: [{ number: 1, status: "DRAFT" as const }],
    },
    {
      name: "Webhook to CRM Workflow",
      description: "Published workflow with version history.",
      status: "ACTIVE" as const,
      folder: "Internal Ops",
      tagNames: ["crm", "demo"],
      versions: [
        { number: 1, status: "ARCHIVED" as const, archivedAt: lastWeek },
        { number: 2, status: "PUBLISHED" as const, publishedAt: now },
        { number: 3, status: "DRAFT" as const },
      ],
      activeVersionNumber: 2,
    },
    {
      name: "Failed Test Workflow",
      description: "Paused workflow with failed run examples.",
      status: "PAUSED" as const,
      folder: "Internal Ops",
      tagNames: ["demo"],
      versions: [{ number: 1, status: "PUBLISHED" as const, publishedAt: lastWeek }],
    },
    {
      name: "Archived Old Workflow",
      description: "Archived workflow for filters.",
      status: "ARCHIVED" as const,
      folder: "Archived Samples",
      tagNames: ["demo"],
      archivedAt: lastWeek,
      versions: [{ number: 1, status: "ARCHIVED" as const, archivedAt: lastWeek }],
    },
    {
      name: "Soft Deleted Sample Workflow",
      description: "Soft-deleted workflow that should stay hidden by default.",
      status: "ARCHIVED" as const,
      folder: "Archived Samples",
      tagNames: ["demo"],
      archivedAt: lastWeek,
      deletedAt: lastWeek,
      versions: [{ number: 1, status: "ARCHIVED" as const, archivedAt: lastWeek, deletedAt: lastWeek }],
    },
  ];

  const workflows = new Map<string, { id: string; activeVersionId: string | null }>();
  for (const seed of workflowSeeds) {
    const workflow = await prisma.workflow.upsert({
      where: { workspaceId_name: { workspaceId: workspace.id, name: seed.name } },
      update: {
        description: seed.description,
        status: seed.status,
        folderId: folders.get(seed.folder)?.id,
        archivedAt: seed.archivedAt,
        deletedAt: seed.deletedAt,
      },
      create: {
        workspaceId: workspace.id,
        folderId: folders.get(seed.folder)?.id,
        createdById: user.id,
        name: seed.name,
        description: seed.description,
        status: seed.status,
        archivedAt: seed.archivedAt,
        deletedAt: seed.deletedAt,
      },
    });

    let activeVersionId: string | null = null;
    for (const versionSeed of seed.versions) {
      const version = await createWorkflowVersion(workflow.id, versionSeed.number, versionSeed.status, {
        publishedAt: versionSeed.publishedAt,
        archivedAt: versionSeed.archivedAt,
        deletedAt: versionSeed.deletedAt,
        notes: `${seed.name} v${versionSeed.number}`,
      });
      if ((seed.activeVersionNumber ?? seed.versions[0].number) === versionSeed.number) {
        activeVersionId = version.id;
      }
    }

    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        activeVersionId,
        publishedAt: seed.status === "ACTIVE" ? now : undefined,
      },
    });

    for (const tagName of seed.tagNames) {
      const tag = tags.get(tagName);
      if (!tag) continue;
      await prisma.workflowTag.upsert({
        where: { workflowId_tagId: { workflowId: workflow.id, tagId: tag.id } },
        update: {},
        create: { workspaceId: workspace.id, workflowId: workflow.id, tagId: tag.id },
      });
    }

    workflows.set(seed.name, { id: workflow.id, activeVersionId });
  }

  const whatsappCredential = await prisma.credentialVault.upsert({
    where: { workspaceId_credentialKey: { workspaceId: workspace.id, credentialKey: "demo.whatsapp" } },
    update: {
      label: "Demo WhatsApp Credential",
      encryptedSecret: "encrypted-placeholder",
      status: "ACTIVE",
    },
    create: {
      workspaceId: workspace.id,
      provider: "whatsapp",
      credentialKey: "demo.whatsapp",
      label: "Demo WhatsApp Credential",
      encryptedSecret: "encrypted-placeholder",
      metadata: toJson({ note: "placeholder secret only" }),
    },
  });

  const openAiCredential = await prisma.credentialVault.upsert({
    where: { workspaceId_credentialKey: { workspaceId: workspace.id, credentialKey: "demo.openai" } },
    update: {
      label: "Demo OpenAI Credential",
      encryptedSecret: "demo-secret-placeholder",
      status: "ACTIVE",
    },
    create: {
      workspaceId: workspace.id,
      provider: "openai",
      credentialKey: "demo.openai",
      label: "Demo OpenAI Credential",
      encryptedSecret: "demo-secret-placeholder",
      metadata: toJson({ note: "placeholder secret only" }),
    },
  });

  for (const connection of [
    { provider: "google_sheets", accountName: "Google Sheets Demo", accountId: "google-demo", status: "ACTIVE" as const, credentialId: null },
    { provider: "whatsapp", accountName: "WhatsApp Business Demo", accountId: "wa-demo", status: "ERROR" as const, credentialId: whatsappCredential.id },
    { provider: "openai", accountName: "OpenAI Demo", accountId: "openai-demo", status: "ACTIVE" as const, credentialId: openAiCredential.id },
    { provider: "slack", accountName: "Slack Demo", accountId: "slack-demo", status: "REVOKED" as const, credentialId: null },
  ]) {
    await prisma.integrationConnection.upsert({
      where: {
        workspaceId_provider_accountId: {
          workspaceId: workspace.id,
          provider: connection.provider,
          accountId: connection.accountId,
        },
      },
      update: {
        accountName: connection.accountName,
        status: connection.status,
        credentialId: connection.credentialId,
        connectedById: user.id,
        scopes: ["read", "write"],
      },
      create: {
        workspaceId: workspace.id,
        provider: connection.provider,
        accountName: connection.accountName,
        accountId: connection.accountId,
        status: connection.status,
        credentialId: connection.credentialId,
        connectedById: user.id,
        scopes: ["read", "write"],
        metadata: toJson({ seeded: true }),
      },
    });
  }

  for (const apiKey of [
    { name: "FlowPilot Dev API Key", prefix: "fp_dev_", keyHash: "fake_hash_for_demo_dev_only", status: "ACTIVE" as const },
    { name: "Old Revoked Key", prefix: "fp_old_", keyHash: "fake_hash_for_demo_revoked_only", status: "REVOKED" as const },
  ]) {
    await prisma.apiKey.upsert({
      where: { keyHash: apiKey.keyHash },
      update: {
        name: apiKey.name,
        prefix: apiKey.prefix,
        status: apiKey.status,
        scopes: ["workflows:read", "workflows:run"],
        revokedAt: apiKey.status === "REVOKED" ? lastWeek : null,
        revokedById: apiKey.status === "REVOKED" ? user.id : null,
      },
      create: {
        workspaceId: workspace.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        keyHash: apiKey.keyHash,
        status: apiKey.status,
        scopes: ["workflows:read", "workflows:run"],
        createdById: user.id,
        revokedAt: apiKey.status === "REVOKED" ? lastWeek : null,
        revokedById: apiKey.status === "REVOKED" ? user.id : null,
      },
    });
  }

  for (const webhook of [
    { name: "Workflow Run Completed Webhook", status: "ACTIVE" as const, events: ["workflow.run.succeeded"] },
    { name: "Workflow Failed Webhook", status: "PAUSED" as const, events: ["workflow.run.failed"] },
    { name: "Lead Created Webhook", status: "REVOKED" as const, events: ["workflow.created"] },
  ]) {
    const existing = await prisma.webhookSubscription.findFirst({
      where: { workspaceId: workspace.id, name: webhook.name },
    });
    const data = {
      url: `https://example.com/webhooks/${webhook.name.toLowerCase().replaceAll(" ", "-")}`,
      secretHash: `fake_hash_${webhook.name.toLowerCase().replaceAll(" ", "_")}`,
      events: webhook.events,
      status: webhook.status,
      createdById: user.id,
      failureCount: webhook.status === "PAUSED" ? 2 : 0,
      lastSuccessAt: webhook.status === "ACTIVE" ? now : null,
      lastFailureAt: webhook.status === "PAUSED" ? now : null,
    };
    if (existing) {
      await prisma.webhookSubscription.update({ where: { id: existing.id }, data });
    } else {
      await prisma.webhookSubscription.create({
        data: { workspaceId: workspace.id, name: webhook.name, ...data },
      });
    }
  }

  const runCount = await prisma.workflowRun.count({ where: { workspaceId: workspace.id } });
  if (runCount === 0) {
    const runSeeds = [
      { workflow: "New Lead Follow-up Workflow", status: "SUCCESS" as const },
      { workflow: "Failed Test Workflow", status: "FAILED" as const },
      { workflow: "Webhook to CRM Workflow", status: "RUNNING" as const },
      { workflow: "Demo AI Email Workflow", status: "CANCELLED" as const },
      { workflow: "New Lead Follow-up Workflow", status: "QUEUED" as const },
    ];

    for (const runSeed of runSeeds) {
      const workflow = workflows.get(runSeed.workflow);
      if (!workflow) continue;
      const run = await prisma.workflowRun.create({
        data: {
          workspaceId: workspace.id,
          workflowId: workflow.id,
          workflowVersionId: workflow.activeVersionId,
          startedById: user.id,
          status: runSeed.status,
          input: toJson({ source: "seed", workflow: runSeed.workflow }),
          output: runSeed.status === "SUCCESS" ? toJson({ ok: true }) : undefined,
          error: runSeed.status === "FAILED" ? toJson({ message: "Node execution failed: missing required config" }) : undefined,
          startedAt: runSeed.status === "QUEUED" ? null : lastWeek,
          finishedAt: ["SUCCESS", "FAILED", "CANCELLED"].includes(runSeed.status) ? now : null,
          cancelledAt: runSeed.status === "CANCELLED" ? now : null,
        },
      });

      const activeVersion = workflow.activeVersionId
        ? await prisma.workflowVersion.findUnique({ where: { id: workflow.activeVersionId }, include: { nodes: true } })
        : null;
      const nodes = activeVersion?.nodes ?? [];

      for (const node of nodes) {
        const failedNode = runSeed.status === "FAILED" && node.type === "debug.log";
        await prisma.workflowStepRun.create({
          data: {
            workspaceId: workspace.id,
            workflowRunId: run.id,
            nodeId: node.id,
            nodeKey: node.nodeKey,
            nodeType: node.type,
            status: failedNode ? "FAILED" : runSeed.status === "QUEUED" ? "QUEUED" : "SUCCESS",
            input: toJson({ source: "seed" }),
            output: failedNode ? undefined : toJson({ ok: true }),
            error: failedNode ? toJson({ message: "missing required config" }) : undefined,
            startedAt: runSeed.status === "QUEUED" ? null : lastWeek,
            finishedAt: runSeed.status === "QUEUED" ? null : now,
          },
        });
      }

      await prisma.executionLog.createMany({
        data: [
          {
            workspaceId: workspace.id,
            workflowRunId: run.id,
            level: "info",
            message: "Workflow started",
            metadata: toJson({ status: runSeed.status }),
          },
          {
            workspaceId: workspace.id,
            workflowRunId: run.id,
            level: runSeed.status === "FAILED" ? "error" : "info",
            message:
              runSeed.status === "FAILED"
                ? "Node execution failed: missing required config"
                : "Workflow completed successfully",
            metadata: toJson({ seeded: true }),
          },
        ],
      });
    }
  }

  for (const usage of [
    { metric: "WORKFLOW_RUN" as const, quantity: 35 },
    { metric: "STEP_RUN" as const, quantity: 120 },
    { metric: "AI_TOKENS" as const, quantity: 5000 },
    { metric: "WEBHOOK_CALL" as const, quantity: 70 },
    { metric: "API_CALL" as const, quantity: 250 },
    { metric: "STORAGE_MB" as const, quantity: 128 },
  ]) {
    const existing = await prisma.usageRecord.findFirst({
      where: {
        workspaceId: workspace.id,
        metric: usage.metric,
        metadata: { path: ["seedKey"], equals: `demo.${usage.metric}` },
      },
    });
    if (!existing) {
      await prisma.usageRecord.create({
        data: {
          workspaceId: workspace.id,
          metric: usage.metric,
          quantity: usage.quantity,
          metadata: toJson({ seedKey: `demo.${usage.metric}` }),
        },
      });
    }
  }

  const auditSeeds = [
    { action: "CREATE" as const, entityType: "Workflow", entityId: workflows.get("New Lead Follow-up Workflow")?.id },
    { action: "WORKFLOW_PUBLISH" as const, entityType: "Workflow", entityId: workflows.get("Webhook to CRM Workflow")?.id },
    { action: "WORKFLOW_RUN" as const, entityType: "WorkflowRun", entityId: null },
    { action: "API_KEY_CREATED" as const, entityType: "ApiKey", entityId: null },
    { action: "CREDENTIAL_CREATED" as const, entityType: "CredentialVault", entityId: whatsappCredential.id },
    { action: "SUBSCRIPTION_UPDATED" as const, entityType: "Subscription", entityId: null },
  ];

  const auditCount = await prisma.auditLog.count({ where: { workspaceId: workspace.id } });
  if (auditCount === 0) {
    await prisma.auditLog.createMany({
      data: auditSeeds.map((audit) => ({
        workspaceId: workspace.id,
        actorUserId: user.id,
        action: audit.action,
        entityType: audit.entityType,
        entityId: audit.entityId,
        metadata: toJson({ seeded: true }),
      })),
    });
  }

  return workflows.get("New Lead Follow-up Workflow")?.id ?? workspace.id;
}

async function main() {
  await seedNodeRegistry();
  const workflowId = await seedDemoWorkflow();
  console.log(`Seed completed. Demo workflow ID: ${workflowId}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
