import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import type { AuthRequest } from "../auth/auth-request";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { ListWorkflowsQueryDto } from "./dto/list-workflows-query.dto";
import { UpdateWorkflowDto } from "./dto/update-workflow.dto";
import { WorkflowsService } from "./workflows.service";

@Controller("workflows")
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @RequirePermissions("workflow:read")
  async findMany(@Req() request: AuthRequest, @Query() query: ListWorkflowsQueryDto) {
    const result = await this.workflowsService.list(request.auth, query);
    return {
      success: true,
      workflows: result.items,
      ...result,
    };
  }

  @Get(":id")
  @RequirePermissions("workflow:read")
  async findOne(@Req() request: AuthRequest, @Param("id") id: string) {
    return {
      success: true,
      workflow: await this.workflowsService.findOne(request.auth, id),
    };
  }

  @Post()
  @RequirePermissions("workflow:create")
  async create(@Req() request: AuthRequest, @Body() body: CreateWorkflowDto) {
    return {
      success: true,
      workflow: await this.workflowsService.create(request.auth, body),
    };
  }

  @Put(":id")
  @RequirePermissions("workflow:update")
  async replace(
    @Req() request: AuthRequest,
    @Param("id") id: string,
    @Body() body: UpdateWorkflowDto
  ) {
    return {
      success: true,
      workflow: await this.workflowsService.update(request.auth, id, body),
    };
  }

  @Patch(":id")
  @RequirePermissions("workflow:update")
  async update(
    @Req() request: AuthRequest,
    @Param("id") id: string,
    @Body() body: UpdateWorkflowDto
  ) {
    return {
      success: true,
      workflow: await this.workflowsService.update(request.auth, id, body),
    };
  }

  @Post(":id/duplicate")
  @RequirePermissions("workflow:create")
  async duplicate(@Req() request: AuthRequest, @Param("id") id: string) {
    return {
      success: true,
      workflow: await this.workflowsService.duplicate(request.auth, id),
    };
  }

  @Post(":id/publish")
  @RequirePermissions("workflow:publish")
  async publish(@Req() request: AuthRequest, @Param("id") id: string) {
    return {
      success: true,
      workflow: await this.workflowsService.publish(request.auth, id),
    };
  }

  @Post(":id/pause")
  @RequirePermissions("workflow:update")
  async pause(@Req() request: AuthRequest, @Param("id") id: string) {
    return {
      success: true,
      workflow: await this.workflowsService.pause(request.auth, id),
    };
  }

  @Post(":id/archive")
  @RequirePermissions("workflow:archive")
  async archive(@Req() request: AuthRequest, @Param("id") id: string) {
    return {
      success: true,
      workflow: await this.workflowsService.archive(request.auth, id),
    };
  }

  @Post(":id/restore")
  @RequirePermissions("workflow:update")
  async restore(@Req() request: AuthRequest, @Param("id") id: string) {
    return {
      success: true,
      workflow: await this.workflowsService.restore(request.auth, id),
    };
  }

  @Delete(":id")
  @RequirePermissions("workflow:delete")
  remove(@Req() request: AuthRequest, @Param("id") id: string) {
    return this.workflowsService.softDelete(request.auth, id);
  }
}
