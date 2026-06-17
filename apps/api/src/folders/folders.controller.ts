import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import type { AuthRequest } from "../auth/auth-request";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { UpdateFolderDto } from "./dto/update-folder.dto";
import { FoldersService } from "./folders.service";

@Controller("folders")
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get()
  @RequirePermissions("folder:read")
  async list(@Req() request: AuthRequest) {
    return {
      success: true,
      folders: await this.foldersService.list(request.auth),
    };
  }

  @Post()
  @RequirePermissions("folder:create")
  async create(@Req() request: AuthRequest, @Body() body: CreateFolderDto) {
    return {
      success: true,
      folder: await this.foldersService.create(request.auth, body),
    };
  }

  @Patch(":id")
  @RequirePermissions("folder:update")
  async update(@Req() request: AuthRequest, @Param("id") id: string, @Body() body: UpdateFolderDto) {
    return {
      success: true,
      folder: await this.foldersService.update(request.auth, id, body),
    };
  }

  @Delete(":id")
  @RequirePermissions("folder:delete")
  softDelete(@Req() request: AuthRequest, @Param("id") id: string) {
    return this.foldersService.softDelete(request.auth, id);
  }
}
