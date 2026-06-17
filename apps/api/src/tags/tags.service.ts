import { Injectable, NotFoundException } from "@nestjs/common";
import type { AuthContext } from "../auth/auth-context";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTagDto } from "./dto/create-tag.dto";
import { UpdateTagDto } from "./dto/update-tag.dto";

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  list(auth: AuthContext) {
    return this.prisma.tag.findMany({
      where: {
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
        status: "ACTIVE",
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  create(auth: AuthContext, body: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        workspaceId: auth.currentWorkspaceId,
        createdById: auth.currentUserId,
        name: body.name,
        color: body.color,
        status: "ACTIVE",
      },
    });
  }

  async update(auth: AuthContext, tagId: string, body: UpdateTagDto) {
    const result = await this.prisma.tag.updateMany({
      where: {
        id: tagId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
        status: "ACTIVE",
      },
      data: {
        name: body.name,
        color: body.color,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Tag not found.");
    }

    return this.prisma.tag.findFirst({
      where: {
        id: tagId,
        workspaceId: auth.currentWorkspaceId,
      },
    });
  }

  async softDelete(auth: AuthContext, tagId: string) {
    const result = await this.prisma.tag.updateMany({
      where: {
        id: tagId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
        status: "ACTIVE",
      },
      data: {
        deletedAt: new Date(),
        status: "ARCHIVED",
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Tag not found.");
    }

    await this.prisma.workflowTag.deleteMany({
      where: {
        workspaceId: auth.currentWorkspaceId,
        tagId,
      },
    });

    return { success: true };
  }
}
