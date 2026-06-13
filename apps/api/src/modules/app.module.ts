import { Module } from "@nestjs/common";
import { HealthController } from "../routes/health.controller";
import { FlowRunsController } from "../routes/flow-runs.controller";
import { QueueService } from "../services/queue.service";

@Module({
  controllers: [HealthController, FlowRunsController],
  providers: [QueueService]
})
export class AppModule {}
