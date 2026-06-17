import type { AuthContext } from "./auth-context";

export type AuthRequest = {
  headers: Record<string, string | string[] | undefined>;
  auth: AuthContext;
};
