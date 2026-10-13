import { UNIT } from "@allonfire/core/shared/constants/units";

/** The API's global rate limit: where it counts, how it answers, and what the env falls back to. */
export const RATE_LIMIT = {
  DEFAULT: {
    MAX: 100,
    TRUSTED_PROXY_HOPS: 0,
    WINDOW_MS: UNIT.MS_PER_MINUTE,
  },
  /** `hono-rate-limiter`'s header spec; draft-6 is the IETF standard set. */
  HEADER_SPEC: "draft-6",
  /** Context key the limiter stores its `RateLimitInfo` under. */
  INFO: "rateLimit",
  /** Namespace for rate-limit counters. Redis db 0 — see `docs/adr/0002`. */
  KEY_PREFIX: "ratelimit:",
  /** The one counter every client without a readable address shares. */
  UNKNOWN_CLIENT: "unknown",
} as const;

export const rateLimitKey = (clientKey: string) =>
  `${RATE_LIMIT.KEY_PREFIX}${clientKey}` as const;
