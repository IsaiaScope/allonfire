import { AUTH } from "@allonfire/auth/shared/constants/auth";
import type { MiddlewareHandler } from "hono";
import { env } from "../../../../environment/environment";
import {
  createRateLimiter,
  type RateLimitStore,
} from "../../../rate-limit/middleware/rate-limiter";
import { LAURA } from "../../constants/laura";

/**
 * How often one User saves a game: counted by the User, not their address
 * (every browser reaches the API through Laura's server, so the address says
 * nothing). A real game takes seconds, so the allowance is a long evening's
 * worth; the global limiter still counts these requests too. A request with
 * no Session passes: the route's guard refuses it.
 */
export const scoreRateLimit = (store: RateLimitStore): MiddlewareHandler => {
  const limiter = createRateLimiter({
    keyOf: (context) => context.get(AUTH.VAR.SESSION)?.user.id ?? "",
    keyPrefix: LAURA.GAMES.RATE_KEY,
    limit: LAURA.GAMES.LIMIT.SAVES,
    store,
    trustedHops: env.API_TRUSTED_PROXY_HOPS,
    windowMs: LAURA.GAMES.WINDOW.SAVES_MS,
  });
  return (context, next) =>
    context.get(AUTH.VAR.SESSION) ? limiter(context, next) : next();
};
