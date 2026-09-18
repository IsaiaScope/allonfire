/**
 * Operational tunables that are not env-configurable. Anything a deployment
 * needs to vary belongs in `src/env.ts` instead — these are the numbers that
 * are the same everywhere the process runs.
 */

const BYTES_PER_KIB = 1024;
const KIB_PER_MIB = 1024;

/** Request body ceiling. Larger bodies get 413 before a handler sees them. */
export const BODY_LIMIT_BYTES = BYTES_PER_KIB * KIB_PER_MIB;

export const MS_PER_SECOND = 1000;

export const REQUEST_TIMEOUT_MS = 30_000;

/** How long in-flight requests get to finish before dependencies close. */
export const DEFAULT_DRAIN_TIMEOUT_MS = 10_000;

/**
 * Redis defaults retry forever and queue commands while disconnected, which
 * turns an outage into hanging requests instead of fast failures.
 */
export const REDIS_RETRY = {
  MAX_PER_REQUEST: 1,
  BACKOFF_STEP_MS: 200,
  BACKOFF_CEILING_MS: 5000,
} as const;

export const DEFAULT_PORT = 3300;
