import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import type { AuthRequest } from "../auth/auth-request";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { RunWorkflowDto } from "./dto/run-workflow.dto";
import { WorkflowRunsService } from "./workflow-runs.service";

@Controller()
@UseGuards(ClerkAuthGuard, PermissionsGuard)
export class WorkflowRunsController {
  constructor(private readonly workflowRunsService: WorkflowRunsService) {}

  @Post("workflows/:workflowId/run")
  @RequirePermissions("workflow:run")
  runWorkflow(
    @Req() request: AuthRequest,
    @Param("workflowId") workflowId: string,
    @Body() body: RunWorkflowDto
  ) {
    return this.workflowRunsService.runWorkflow(request.auth, workflowId, body.input ?? {});
  }

  @Post("workflows/:workflowId/run-direct")
  @RequirePermissions("workflow:run")
  async runWorkflowDirect(
    @Req() request: AuthRequest,
    @Param("workflowId") workflowId: string,
    @Body() body: RunWorkflowDto
  ) {
    return {
      success: true,
      run: await this.workflowRunsService.runWorkflowDirect(request.auth, workflowId, body.input ?? {}),
    };
  }

  @Get("workflows/:workflowId/runs")
  @RequirePermissions("workflow:read")
  async findRunsForWorkflow(@Req() request: AuthRequest, @Param("workflowId") workflowId: string) {
    return {
      success: true,
      runs: await this.workflowRunsService.findRunsForWorkflow(request.auth, workflowId),
    };
  }

  @Get("workflow-runs/:runId")
  @RequirePermissions("workflow:read")
  async findOne(@Req() request: AuthRequest, @Param("runId") runId: string) {
    return {
      success: true,
      run: await this.workflowRunsService.findOne(request.auth, runId),
    };
  }

  @Get("workflow-runs/:runId/logs")
  @RequirePermissions("workflow:read")
  async findLogs(@Req() request: AuthRequest, @Param("runId") runId: string) {
    return {
      success: true,
      logs: await this.workflowRunsService.findLogsForRun(request.auth, runId),
    };
  }
}
