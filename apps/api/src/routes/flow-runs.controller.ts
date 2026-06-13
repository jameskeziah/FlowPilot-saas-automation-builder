import { Body, Controller, Param, Post } from "@nestjs/common";
import { prisma, type Prisma } from "@flowpilot/database";
import { QueueService } from "../services/queue.service";

@Controller("workflows")
export class FlowRunsController {
  constructor(private readonly queueService: QueueService) {}

  @Post(":workflowId/run")
  async runWorkflow(@Param("workflowId") workflowId: string, @Body() body: { input?: unknown }) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        activeVersion: true,
        versions: {
          orderBy: { version: "desc" },
          take: 1
        }
      }
    });

    if (!workflow) {
      return {
        queued: false,
        workflowId,
        error: "Workflow not found"
      };
    }

    const version = workflow.activeVersion ?? workflow.versions[0];

    if (!version) {
      return {
        queued: false,
        workflowId,
        error: "Workflow has no version to execute"
      };
    }

    const input = body?.input ?? {};
    const workflowRun = await prisma.workflowRun.create({
      data: {
        workflowId,
        workflowVersionId: version.id,
        status: "QUEUED",
        input: JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue
      }
    });

    const job = await this.queueService.enqueueWorkflowRun({
      workflowId,
      workflowVersionId: version.id,
      workflowRunId: workflowRun.id,
      workspaceId: workflow.workspaceId,
      input
    });

    return {
      queued: true,
      jobId: job.id,
      workflowId,
      workflowVersionId: version.id,
      workflowRunId: workflowRun.id
    };
  }
}
