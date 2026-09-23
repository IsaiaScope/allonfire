/** Namespace for rate-limit counters. Redis db 0 — see `docs/adr/0002`. */
export const RATE_LIMIT_KEY_PREFIX = "ratelimit:";

export const rateLimitKey = (clientKey: string): string =>
  `${RATE_LIMIT_KEY_PREFIX}${clientKey}`;

/** Name the INCR+PEXPIRE Lua script is registered under via `defineCommand`. */
export const RATE_LIMIT_COMMAND = "rateLimitIncrement";

/** `hono-rate-limiter`'s header spec; draft-6 is the IETF standard set. */
export const RATE_LIMIT_HEADER_SPEC = "draft-6";

/** Context key the limiter stores its `RateLimitInfo` under. */
export const RATE_LIMIT_INFO = "rateLimit";

export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX = 100;
export const DEFAULT_TRUSTED_PROXY_HOPS = 0;
