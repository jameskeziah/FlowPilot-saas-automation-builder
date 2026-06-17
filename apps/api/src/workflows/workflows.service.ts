import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, WorkflowStatus, type Workflow } from "@flowpilot/database";
import type { AuthContext } from "../auth/auth-context";
import { PrismaService } from "../prisma/prisma.service";
import type {
  WorkflowFlowEdgeDto,
  WorkflowFlowNodeDto,
} from "./dto/create-workflow.dto";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { ListWorkflowsQueryDto } from "./dto/list-workflows-query.dto";
import { UpdateWorkflowDto } from "./dto/update-workflow.dto";
import { WorkflowValidationService } from "./workflow-validation.service";

const toInputJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;

const workflowGraphInclude = {
  folder: true,
  tags: {
    include: {
      tag: true,
    },
  },
  activeVersion: true,
  versions: {
    orderBy: { versionNumber: "desc" },
    take: 1,
    include: {
      nodes: true,
      edges: {
        include: {
          sourceNode: true,
          targetNode: true,
        },
      },
    },
  },
} satisfies Prisma.WorkflowInclude;

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: WorkflowValidationService
  ) {}

  async list(auth: AuthContext, query: ListWorkflowsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkflowWhereInput = {
      workspaceId: auth.currentWorkspaceId,
      deletedAt: null,
      status: {
        not: WorkflowStatus.DELETED,
      },
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.folderId) {
      where.folderId = query.folderId;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.tagId) {
      where.tags = {
        some: {
          tagId: query.tagId,
          workspaceId: auth.currentWorkspaceId,
        },
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.workflow.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          updatedAt: "desc",
        },
        include: workflowGraphInclude,
      }),
      this.prisma.workflow.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMany(auth: AuthContext) {
    const result = await this.list(auth, new ListWorkflowsQueryDto());
    return result.items;
  }

  async findOne(auth: AuthContext, workflowId: string) {
    return this.getById(auth, workflowId);
  }

  async getById(auth: AuthContext, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
        status: {
          not: WorkflowStatus.DELETED,
        },
      },
      include: workflowGraphInclude,
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    return workflow;
  }

  async create(auth: AuthContext, body: CreateWorkflowDto) {
    const graph = this.getOptionalGraph(body.nodes, body.edges);
    if (graph) this.validation.validateDraft(graph);
    if (body.folderId) await this.requireFolder(auth, body.folderId);
    if (body.tagIds?.length) await this.requireTags(auth, body.tagIds);

    const workflow = await this.prisma.$transaction(async (tx) => {
      const createdWorkflow = await tx.workflow.create({
        data: {
          name: body.name,
          description: body.description,
          folderId: body.folderId,
          workspaceId: auth.currentWorkspaceId,
          createdById: auth.currentUserId,
          status: WorkflowStatus.DRAFT,
        },
      });

      if (graph) {
        await this.createVersion(tx, createdWorkflow, auth, graph.nodes, graph.edges);
      }

      await this.syncTags(tx, auth, createdWorkflow.id, body.tagIds);

      await tx.auditLog.create({
        data: {
          workspaceId: auth.currentWorkspaceId,
          actorUserId: auth.currentUserId,
          action: "CREATE",
          entityType: "Workflow",
          entityId: createdWorkflow.id,
          metadata: toInputJson({ source: "api" }),
        },
      });

      return tx.workflow.findFirst({
        where: {
          id: createdWorkflow.id,
          workspaceId: auth.currentWorkspaceId,
        },
        include: workflowGraphInclude,
      });
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    return workflow;
  }

  async update(auth: AuthContext, workflowId: string, body: UpdateWorkflowDto) {
    const existing = await this.requireWorkflow(auth, workflowId);
    const graph = this.getOptionalGraph(body.nodes, body.edges);
    if (graph) this.validation.validateDraft(graph);
    if (body.folderId) await this.requireFolder(auth, body.folderId);
    if (body.tagIds) await this.requireTags(auth, body.tagIds);

    const workflow = await this.prisma.$transaction(async (tx) => {
      await tx.workflow.updateMany({
        where: {
          id: workflowId,
          workspaceId: auth.currentWorkspaceId,
          deletedAt: null,
          status: {
            not: WorkflowStatus.DELETED,
          },
        },
        data: {
          name: body.name,
          description: body.description,
          folderId: body.folderId === null ? null : body.folderId,
        },
      });

      if (graph) {
        await this.createVersion(tx, existing, auth, graph.nodes, graph.edges);
      }

      if (body.tagIds) {
        await this.syncTags(tx, auth, workflowId, body.tagIds);
      }

      await tx.auditLog.create({
        data: {
          workspaceId: auth.currentWorkspaceId,
          actorUserId: auth.currentUserId,
          action: "UPDATE",
          entityType: "Workflow",
          entityId: workflowId,
          metadata: toInputJson({ source: "api" }),
        },
      });

      return tx.workflow.findFirst({
        where: {
          id: workflowId,
          workspaceId: auth.currentWorkspaceId,
          deletedAt: null,
        },
        include: workflowGraphInclude,
      });
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    return workflow;
  }

  async publish(auth: AuthContext, workflowId: string) {
    const workflow = await this.requireWorkflow(auth, workflowId);

    if (workflow.status === WorkflowStatus.ARCHIVED) {
      throw new BadRequestException("Archived workflow must be restored before publishing.");
    }

    const latestVersion = await this.prisma.workflowVersion.findFirst({
      where: {
        workflowId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
      },
      orderBy: { versionNumber: "desc" },
    });

    if (!latestVersion) {
      throw new BadRequestException("Workflow must have a saved version before publishing.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workflowVersion.updateMany({
        where: {
          id: latestVersion.id,
          workspaceId: auth.currentWorkspaceId,
        },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      await tx.workflow.updateMany({
        where: {
          id: workflowId,
          workspaceId: auth.currentWorkspaceId,
          deletedAt: null,
        },
        data: {
          status: WorkflowStatus.ACTIVE,
          activeVersionId: latestVersion.id,
          publishedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId: auth.currentWorkspaceId,
          actorUserId: auth.currentUserId,
          action: "WORKFLOW_PUBLISH",
          entityType: "Workflow",
          entityId: workflowId,
          metadata: toInputJson({ workflowVersionId: latestVersion.id }),
        },
      });
    });

    return this.getById(auth, workflowId);
  }

  async pause(auth: AuthContext, workflowId: string) {
    const workflow = await this.requireWorkflow(auth, workflowId);

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new BadRequestException("Only active workflows can be paused.");
    }

    await this.prisma.workflow.updateMany({
      where: {
        id: workflowId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
      },
      data: {
        status: WorkflowStatus.PAUSED,
      },
    });

    return this.getById(auth, workflowId);
  }

  async archive(auth: AuthContext, workflowId: string) {
    await this.requireWorkflow(auth, workflowId);

    await this.prisma.$transaction(async (tx) => {
      await tx.workflow.updateMany({
        where: {
          id: workflowId,
          workspaceId: auth.currentWorkspaceId,
          deletedAt: null,
        },
        data: {
          status: WorkflowStatus.ARCHIVED,
          archivedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId: auth.currentWorkspaceId,
          actorUserId: auth.currentUserId,
          action: "WORKFLOW_ARCHIVE",
          entityType: "Workflow",
          entityId: workflowId,
          metadata: toInputJson({ source: "api" }),
        },
      });
    });

    return this.getById(auth, workflowId);
  }

  async restore(auth: AuthContext, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        workspaceId: auth.currentWorkspaceId,
      },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    if (workflow.status !== WorkflowStatus.ARCHIVED && workflow.status !== WorkflowStatus.DELETED) {
      throw new BadRequestException("Only archived or deleted workflows can be restored.");
    }

    await this.prisma.workflow.updateMany({
      where: {
        id: workflowId,
        workspaceId: auth.currentWorkspaceId,
      },
      data: {
        status: WorkflowStatus.DRAFT,
        archivedAt: null,
        deletedAt: null,
      },
    });

    return this.getById(auth, workflowId);
  }

  async softDelete(auth: AuthContext, workflowId: string) {
    await this.requireWorkflow(auth, workflowId);

    await this.prisma.$transaction(async (tx) => {
      await tx.workflow.updateMany({
        where: {
          id: workflowId,
          workspaceId: auth.currentWorkspaceId,
          deletedAt: null,
        },
        data: {
          status: WorkflowStatus.DELETED,
          deletedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId: auth.currentWorkspaceId,
          actorUserId: auth.currentUserId,
          action: "DELETE",
          entityType: "Workflow",
          entityId: workflowId,
          metadata: toInputJson({ softDelete: true }),
        },
      });
    });

    return { success: true };
  }

  async remove(auth: AuthContext, workflowId: string) {
    return this.softDelete(auth, workflowId);
  }

  async duplicate(auth: AuthContext, workflowId: string) {
    const source = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
        status: {
          not: WorkflowStatus.DELETED,
        },
      },
      include: workflowGraphInclude,
    });

    if (!source) {
      throw new NotFoundException("Workflow not found");
    }

    return this.prisma.$transaction(async (tx) => {
      const createdWorkflow = await tx.workflow.create({
        data: {
          workspaceId: auth.currentWorkspaceId,
          createdById: auth.currentUserId,
          name: await this.nextCopyName(auth.currentWorkspaceId, source.name),
          description: source.description,
          folderId: source.folderId,
          status: WorkflowStatus.DRAFT,
        },
      });

      const sourceVersion = source.versions[0];

      if (sourceVersion) {
        const createdVersion = await tx.workflowVersion.create({
          data: {
            workspaceId: auth.currentWorkspaceId,
            workflowId: createdWorkflow.id,
            createdById: auth.currentUserId,
            versionNumber: 1,
            status: "DRAFT",
            definition: toInputJson(sourceVersion.definition),
          },
        });

        await tx.workflow.update({
          where: { id: createdWorkflow.id },
          data: { activeVersionId: createdVersion.id },
        });

        const nodeIdMap = new Map<string, string>();

        for (const node of sourceVersion.nodes) {
          const createdNode = await tx.workflowNode.create({
            data: {
              workspaceId: auth.currentWorkspaceId,
              workflowVersionId: createdVersion.id,
              nodeKey: node.nodeKey,
              type: node.type,
              label: node.label,
              positionX: node.positionX,
              positionY: node.positionY,
              config: toInputJson(node.config),
            },
          });

          nodeIdMap.set(node.id, createdNode.id);
        }

        for (const edge of sourceVersion.edges) {
          const sourceNodeId = nodeIdMap.get(edge.sourceNodeId);
          const targetNodeId = nodeIdMap.get(edge.targetNodeId);
          if (!sourceNodeId || !targetNodeId) continue;

          await tx.workflowEdge.create({
            data: {
              workspaceId: auth.currentWorkspaceId,
              workflowVersionId: createdVersion.id,
              edgeKey: edge.edgeKey,
              sourceNodeId,
              targetNodeId,
              sourceHandle: edge.sourceHandle,
              targetHandle: edge.targetHandle,
              condition: edge.condition === null ? undefined : toInputJson(edge.condition),
            },
          });
        }
      }

      await this.syncTags(
        tx,
        auth,
        createdWorkflow.id,
        source.tags.map((item) => item.tagId)
      );

      await tx.auditLog.create({
        data: {
          workspaceId: auth.currentWorkspaceId,
          actorUserId: auth.currentUserId,
          action: "CREATE",
          entityType: "Workflow",
          entityId: createdWorkflow.id,
          metadata: toInputJson({ duplicatedFromWorkflowId: workflowId }),
        },
      });

      return tx.workflow.findFirstOrThrow({
        where: {
          id: createdWorkflow.id,
          workspaceId: auth.currentWorkspaceId,
        },
        include: workflowGraphInclude,
      });
    });
  }

  private getOptionalGraph(nodes?: WorkflowFlowNodeDto[], edges?: WorkflowFlowEdgeDto[]) {
    if (nodes === undefined && edges === undefined) {
      return null;
    }

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      throw new BadRequestException("nodes and edges must both be provided.");
    }

    return { nodes, edges };
  }

  private async createVersion(
    tx: Prisma.TransactionClient,
    workflow: Pick<Workflow, "id" | "workspaceId">,
    auth: AuthContext,
    nodes: WorkflowFlowNodeDto[],
    edges: WorkflowFlowEdgeDto[]
  ) {
    const latest = await tx.workflowVersion.findFirst({
      where: {
        workflowId: workflow.id,
        workspaceId: auth.currentWorkspaceId,
      },
      orderBy: { versionNumber: "desc" },
    });

    const version = await tx.workflowVersion.create({
      data: {
        workspaceId: workflow.workspaceId,
        workflowId: workflow.id,
        createdById: auth.currentUserId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        status: "DRAFT",
        definition: toInputJson({ nodes, edges }),
      },
    });

    await tx.workflow.updateMany({
      where: {
        id: workflow.id,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
      },
      data: {
        activeVersionId: version.id,
      },
    });

    const nodeIdMap = new Map<string, string>();

    for (const node of nodes) {
      const createdNode = await tx.workflowNode.create({
        data: {
          workspaceId: workflow.workspaceId,
          workflowVersionId: version.id,
          nodeKey: node.id,
          type: node.type,
          label: node.type,
          positionX: node.position.x,
          positionY: node.position.y,
          config: toInputJson(node.data ?? {}),
        },
      });

      nodeIdMap.set(node.id, createdNode.id);
    }

    for (const edge of edges) {
      const sourceNodeId = nodeIdMap.get(edge.source);
      const targetNodeId = nodeIdMap.get(edge.target);

      if (!sourceNodeId || !targetNodeId) {
        throw new BadRequestException(`Invalid edge ${edge.id}: source or target node missing`);
      }

      await tx.workflowEdge.create({
        data: {
          workspaceId: workflow.workspaceId,
          workflowVersionId: version.id,
          edgeKey: edge.id,
          sourceNodeId,
          targetNodeId,
          sourceHandle: edge.sourceHandle ?? null,
          targetHandle: edge.targetHandle ?? null,
        },
      });
    }

    return version;
  }

  private async syncTags(
    tx: Prisma.TransactionClient,
    auth: AuthContext,
    workflowId: string,
    tagIds: string[] | undefined
  ) {
    if (!tagIds) return;

    const uniqueTagIds = [...new Set(tagIds)];

    await tx.workflowTag.deleteMany({
      where: {
        workspaceId: auth.currentWorkspaceId,
        workflowId,
      },
    });

    if (uniqueTagIds.length > 0) {
      await tx.workflowTag.createMany({
        data: uniqueTagIds.map((tagId) => ({
          workspaceId: auth.currentWorkspaceId,
          workflowId,
          tagId,
        })),
        skipDuplicates: true,
      });
    }
  }

  private async requireWorkflow(auth: AuthContext, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: workflowId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
        status: {
          not: WorkflowStatus.DELETED,
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException("Workflow not found");
    }

    return workflow;
  }

  private async requireFolder(auth: AuthContext, folderId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
        status: "ACTIVE",
      },
    });

    if (!folder) {
      throw new BadRequestException("Invalid folder.");
    }

    return folder;
  }

  private async requireTags(auth: AuthContext, tagIds: string[]) {
    const uniqueTagIds = [...new Set(tagIds)];

    const count = await this.prisma.tag.count({
      where: {
        id: {
          in: uniqueTagIds,
        },
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
        status: "ACTIVE",
      },
    });

    if (count !== uniqueTagIds.length) {
      throw new BadRequestException("One or more tags are invalid.");
    }
  }

  private async nextCopyName(workspaceId: string, sourceName: string) {
    const baseName = `${sourceName} Copy`;
    let name = baseName;
    let suffix = 2;

    while (
      await this.prisma.workflow.findFirst({
        where: {
          workspaceId,
          name,
          deletedAt: null,
          status: {
            not: WorkflowStatus.DELETED,
          },
        },
        select: { id: true },
      })
    ) {
      name = `${baseName} ${suffix}`;
      suffix += 1;
    }

    return name;
  }
}
