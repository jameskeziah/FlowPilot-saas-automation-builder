import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { apiEnv } from "@flowpilot/env/api";
import { QUEUE_NAMES, type WorkflowRunJob } from "@flowpilot/shared";

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly connection = new IORedis(apiEnv.REDIS_URL, {
    maxRetriesPerRequest: null
  });

  private readonly workflowQueue = new Queue<WorkflowRunJob, unknown, "workflow.run">(QUEUE_NAMES.workflowRuns, {
    connection: this.connection as unknown as ConnectionOptions
  });

  enqueueWorkflowRun(job: WorkflowRunJob) {
    return this.workflowQueue.add("workflow.run", job, {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500
    });
  }

  async onModuleDestroy() {
    await this.workflowQueue.close();
    await this.connection.quit();
  }
}
