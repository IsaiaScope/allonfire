import { env } from "../../../environment/environment";
import {
  type RateLimitStore,
  userRateLimiter,
} from "../../rate-limit/middleware/rate-limiter";

/**
 * The Export bucket (`GET /v1/images/:id/export`, ADR 0036), one per User:
 * each request is a decode and a re-encode. Fails open like the global
 * limiter. Shares the global store; the key prefix keeps the counts apart and
 * the window comes from here.
 */
export const exportRateLimit = (store: RateLimitStore) =>
  userRateLimiter({
    keyPrefix: env.STORAGE_EXPORT_RATE_LIMIT_KEY_PREFIX,
    limit: env.STORAGE_EXPORT_RATE_LIMIT_MAX,
    store,
    windowMs: env.STORAGE_EXPORT_RATE_LIMIT_WINDOW_MS,
  });
