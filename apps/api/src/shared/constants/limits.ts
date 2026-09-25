import { BYTES_PER_MIB } from "@allonfire/utils/constants/units";

/**
 * Operational tunables that are not env-configurable. Anything a deployment
 * needs to vary belongs in `src/env.ts` instead — these are the numbers that
 * are the same everywhere the process runs.
 */

/** Request body ceiling. Larger bodies get 413 before a handler sees them. */
export const BODY_LIMIT_BYTES = BYTES_PER_MIB;

export const REQUEST_TIMEOUT_MS = 30_000;

/** How long in-flight requests get to finish before dependencies close. */
export const DEFAULT_DRAIN_TIMEOUT_MS = 10_000;

/**
 * How long the final telemetry flush may take. The OTLP exporter retries an
 * unreachable collector for ~8s; tsx watch force-kills after 5s and Docker
 * after 10s, so the flush gets less than either.
 */
export const TELEMETRY_FLUSH_TIMEOUT_MS = 2000;

/**
 * Redis defaults retry forever and queue commands while disconnected, which
 * turns an outage into hanging requests instead of fast failures.
 */
export const REDIS_RETRY = {
  BACKOFF_CEILING_MS: 5000,
  BACKOFF_STEP_MS: 200,
  MAX_PER_REQUEST: 1,
} as const;

export const DEFAULT_PORT = 3300;
