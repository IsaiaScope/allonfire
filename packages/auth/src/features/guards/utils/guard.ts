import { HTTP_STATUS } from "@allonfire/utils/constants/http";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { AUTH_VAR } from "../../../shared/constants/variables";
import type { AuthSession } from "../../../shared/types/auth";
import type { SignedInEnv } from "../../../shared/types/variables";

/**
 * 401 without a Session, 403 when `allows` says no.
 *
 * Typed `SignedInEnv` for what it guarantees the handlers after it. Hono's
 * `Context` is invariant, so the handler cannot take the nullable `AuthEnv`
 * instead; the read below widens back to `| null`, which is what it may
 * really be at this point (no loader ran, or the request is anonymous).
 */
export const guard =
  (allows: (session: AuthSession) => boolean): MiddlewareHandler<SignedInEnv> =>
  async (context, next) => {
    const session: AuthSession | null = context.get(AUTH_VAR.SESSION);
    if (!session) {
      throw new HTTPException(HTTP_STATUS.UNAUTHORIZED);
    }
    if (!allows(session)) {
      throw new HTTPException(HTTP_STATUS.FORBIDDEN);
    }
    await next();
  };
