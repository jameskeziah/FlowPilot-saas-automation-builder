import { z } from "zod";
import { validateEnv } from "./core";

const optionalNonEmptyString = z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional());

const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalNonEmptyString,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: optionalNonEmptyString,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: optionalNonEmptyString,
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: optionalNonEmptyString,
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: optionalNonEmptyString,
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export const webEnv = validateEnv("Web", webEnvSchema);

export function getWebEnv() {
  return webEnv;
}
