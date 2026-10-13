import { HTTP } from "@allonfire/core/features/http/constants/http";
import { PATTERN } from "@allonfire/core/shared/constants/patterns";
import type { Env, MiddlewareHandler } from "hono";
import { AUTH } from "../../../../shared/constants/auth";
import type { AuthLike } from "../../../../shared/types/auth";

/**
 * Runs the host's limiter on the auth routes that check a password only. The
 * host owns the limiter (its store, proxy hops, 429 body); the module owns
 * which requests count.
 * Build it with the `AUTH_RATE_LIMIT_*` env values.
 */
export const authLimit = <E extends Env>(
  auth: AuthLike,
  limiter: MiddlewareHandler<E>
): MiddlewareHandler<E> => {
  const routes: ReadonlySet<string> = new Set(
    AUTH.LIMITED_PATHS.map((path) => `${auth.basePath}${path}`)
  );
  return (context, next) =>
    context.req.method === HTTP.METHOD.POST &&
    routes.has(context.req.path.replace(PATTERN.TRAILING_SLASHES, ""))
      ? limiter(context, next)
      : next();
};
