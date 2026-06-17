import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { QueueService } from "../services/queue.service";
import { WorkflowRunsController } from "./workflow-runs.controller";
import { WorkflowRunsService } from "./workflow-runs.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WorkflowRunsController],
  providers: [QueueService, WorkflowRunsService],
})
export class WorkflowRunsModule {}
