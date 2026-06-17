import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FoldersModule } from "../folders/folders.module";
import { HealthController } from "../routes/health.controller";
import { MeController } from "../routes/me.controller";
import { TagsModule } from "../tags/tags.module";
import { WorkflowRunsModule } from "../workflow-runs/workflow-runs.module";
import { WorkflowsModule } from "../workflows/workflows.module";

@Module({
  imports: [AuthModule, FoldersModule, TagsModule, WorkflowsModule, WorkflowRunsModule],
  controllers: [HealthController, MeController],
})
export class AppModule {}
