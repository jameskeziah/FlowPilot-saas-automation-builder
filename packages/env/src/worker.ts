import { z } from "zod";
import { validateEnv } from "./core";

const optionalNonEmptyString = z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional());

const workerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().min(1),
  OPENAI_API_KEY: optionalNonEmptyString,
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export const workerEnv = validateEnv("Worker", workerEnvSchema);

export function getWorkerEnv() {
  return workerEnv;
}
