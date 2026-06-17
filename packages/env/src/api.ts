import { z } from "zod";
import { validateEnv } from "./core";

const optionalNonEmptyString = z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional());

const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().min(1),
  API_PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  CLERK_SECRET_KEY: optionalNonEmptyString,
  CLERK_PUBLISHABLE_KEY: optionalNonEmptyString,
  WEB_APP_URL: z.string().url().optional(),
  OPENAI_API_KEY: optionalNonEmptyString,
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const apiEnv = validateEnv("API", apiEnvSchema);

export function getApiEnv() {
  return apiEnv;
}
