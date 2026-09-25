import type { AUTH_VAR } from "../constants/variables";
import type { AuthSession } from "./auth";

export type AuthVariables = {
  /** Set by `sessionLoader`; null when the request is anonymous. */
  [AUTH_VAR.SESSION]: AuthSession | null;
};

export type AuthEnv = { Variables: AuthVariables };

/**
 * What a guard promises the handlers after it: the Session is there. Hono
 * intersects it with the host's env, so `c.get("session")` is `AuthSession`,
 * not `AuthSession | null`, with no `!` and no cast.
 */
export type SignedInEnv = {
  Variables: { [AUTH_VAR.SESSION]: AuthSession };
};
