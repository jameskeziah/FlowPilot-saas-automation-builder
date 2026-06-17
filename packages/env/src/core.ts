import { config } from "dotenv";
import { ZodError, type ZodType } from "zod";

const envFiles = [".env", "../../.env", "packages/database/.env", "../../packages/database/.env"];

let loaded = false;

export function loadEnvFiles() {
  if (loaded) return;

  for (const envFile of envFiles) {
    config({ path: envFile, override: false, quiet: true });
  }

  loaded = true;
}

export function validateEnv<T>(appName: string, schema: ZodType<T>) {
  loadEnvFiles();

  const result = schema.safeParse(process.env);
  if (result.success) return result.data;

  throw new Error(formatEnvError(appName, result.error));
}

export function formatEnvError(appName: string, error: ZodError) {
  const issues = error.issues.map((issue) => {
    const key = issue.path.join(".") || "env";
    return `- ${key}: ${issue.message}`;
  });

  return [`${appName} environment validation failed:`, ...issues].join("\n");
}
