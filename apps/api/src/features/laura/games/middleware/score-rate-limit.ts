import type { MiddlewareHandler } from "hono";
import {
  type RateLimitStore,
  userRateLimiter,
} from "../../../rate-limit/middleware/rate-limiter";
import { LAURA } from "../../constants/laura";

/**
 * How often one User saves a game: counted by the User, not their address
 * (every browser reaches the API through Laura's server, so the address says
 * nothing). A real game takes seconds, so the allowance is a long evening's
 * worth; the global limiter still counts these requests too.
 */
export const scoreRateLimit = (store: RateLimitStore): MiddlewareHandler =>
  userRateLimiter({
    keyPrefix: LAURA.GAMES.RATE_KEY,
    limit: LAURA.GAMES.LIMIT.SAVES,
    store,
    windowMs: LAURA.GAMES.WINDOW.SAVES_MS,
  });
