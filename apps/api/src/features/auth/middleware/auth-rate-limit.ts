import { authLimit } from "@allonfire/auth/hono/middleware/auth-limit";
import type { AuthLike } from "@allonfire/auth/types";
import { env } from "../../environment/environment";
import {
  createRateLimiter,
  type RateLimitStore,
} from "../../rate-limit/middleware/rate-limiter";

/**
 * The auth bucket: sign-in and change-password, where each request is a
 * password guess. Fails open like the global limiter: with Redis down, scrypt's
 * cost per guess is the only brake. Shares the global store; the key prefix
 * keeps the counts apart and the window comes from here.
 */
export const authRateLimit = (auth: AuthLike, store: RateLimitStore) =>
  authLimit(
    auth,
    createRateLimiter({
      keyPrefix: env.AUTH_RATE_LIMIT_KEY_PREFIX,
      limit: env.AUTH_RATE_LIMIT_MAX,
      store,
      trustedHops: env.TRUSTED_PROXY_HOPS,
      windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    })
  );
