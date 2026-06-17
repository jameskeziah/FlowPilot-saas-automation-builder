import { Injectable, NotFoundException } from "@nestjs/common";
import type { AuthContext } from "../auth/auth-context";
import { PrismaService } from "../prisma/prisma.service";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { UpdateFolderDto } from "./dto/update-folder.dto";

@Injectable()
export class FoldersService {
  constructor(private readonly prisma: PrismaService) {}

  list(auth: AuthContext) {
    return this.prisma.folder.findMany({
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

  create(auth: AuthContext, body: CreateFolderDto) {
    return this.prisma.folder.create({
      data: {
        workspaceId: auth.currentWorkspaceId,
        createdById: auth.currentUserId,
        name: body.name,
        description: body.description,
        color: body.color,
        status: "ACTIVE",
      },
    });
  }

  async update(auth: AuthContext, folderId: string, body: UpdateFolderDto) {
    const result = await this.prisma.folder.updateMany({
      where: {
        id: folderId,
        workspaceId: auth.currentWorkspaceId,
        deletedAt: null,
        status: "ACTIVE",
      },
      data: {
        name: body.name,
        description: body.description,
        color: body.color,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Folder not found.");
    }

    return this.prisma.folder.findFirst({
      where: {
        id: folderId,
        workspaceId: auth.currentWorkspaceId,
      },
    });
  }

  async softDelete(auth: AuthContext, folderId: string) {
    const result = await this.prisma.folder.updateMany({
      where: {
        id: folderId,
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
      throw new NotFoundException("Folder not found.");
    }

    await this.prisma.workflow.updateMany({
      where: {
        folderId,
        workspaceId: auth.currentWorkspaceId,
      },
      data: {
        folderId: null,
      },
    });

    return { success: true };
  }
}
