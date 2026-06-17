import { Worker, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { workerEnv } from "@flowpilot/env/worker";
import { QUEUE_NAMES, type WorkflowRunJob } from "@flowpilot/shared";
import { executeWorkflowRun } from "@flowpilot/nodes";

const connection = new IORedis(workerEnv.REDIS_URL, {
  maxRetriesPerRequest: null
});

const worker = new Worker<WorkflowRunJob, unknown, "workflow.run">(
  QUEUE_NAMES.workflowRuns,
  async (job) => {
    console.log("Processing workflow run", {
      jobId: job.id,
      workspaceId: job.data.workspaceId,
      workflowId: job.data.workflowId,
      workflowVersionId: job.data.workflowVersionId,
      workflowRunId: job.data.workflowRunId
    });

    const result = await executeWorkflowRun(job.data);

    console.log("Workflow run completed", result);
    return result;
  },
  { connection: connection as unknown as ConnectionOptions }
);

worker.on("completed", (job) => {
  console.log(`Completed job ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Failed job ${job?.id}`, error);
});

process.on("SIGINT", async () => {
  await worker.close();
  await connection.quit();
  process.exit(0);
});

console.log("FlowPilot worker listening for workflow jobs...");
