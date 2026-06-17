import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WorkflowValidationService } from "./workflow-validation.service";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WorkflowsController],
  providers: [WorkflowValidationService, WorkflowsService],
  exports: [WorkflowValidationService, WorkflowsService],
})
export class WorkflowsModule {}
