import { UNIT } from "@allonfire/core/shared/constants/units";

/** What the API knows of ioredis: its events, its replies and how it retries. */
export const REDIS = {
  /**
   * `cacheAside` and `forgetCached`: a forget leaves a mark under the key plus
   * `FORGOTTEN_SUFFIX` for `FORGOTTEN_MS`, longer than any load takes, so a
   * load that began before it never keeps what it read.
   */
  CACHE_ASIDE: {
    FORGOTTEN_MS: UNIT.MS_PER_MINUTE,
    FORGOTTEN_SUFFIX: ":forgotten",
  },
  EVENT: {
    ERROR: "error",
    READY: "ready",
  },
  PING_REPLY: "PONG",
  /**
   * Redis defaults retry forever and queue commands while disconnected, which
   * turns an outage into hanging requests instead of fast failures.
   */
  RETRY: {
    BACKOFF_CEILING_MS: 5 * UNIT.MS_PER_SECOND,
    BACKOFF_STEP_MS: 200,
    MAX_PER_REQUEST: 1,
  },
  STATUS: { READY: "ready" },
} as const;
