import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import type { AuthRequest } from "../auth/auth-request";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { CreateTagDto } from "./dto/create-tag.dto";
import { UpdateTagDto } from "./dto/update-tag.dto";
import { TagsService } from "./tags.service";

@Controller("tags")
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @RequirePermissions("tag:read")
  async list(@Req() request: AuthRequest) {
    return {
      success: true,
      tags: await this.tagsService.list(request.auth),
    };
  }

  @Post()
  @RequirePermissions("tag:create")
  async create(@Req() request: AuthRequest, @Body() body: CreateTagDto) {
    return {
      success: true,
      tag: await this.tagsService.create(request.auth, body),
    };
  }

  @Patch(":id")
  @RequirePermissions("tag:update")
  async update(@Req() request: AuthRequest, @Param("id") id: string, @Body() body: UpdateTagDto) {
    return {
      success: true,
      tag: await this.tagsService.update(request.auth, id, body),
    };
  }

  @Delete(":id")
  @RequirePermissions("tag:delete")
  softDelete(@Req() request: AuthRequest, @Param("id") id: string) {
    return this.tagsService.softDelete(request.auth, id);
  }
}
