import {
  MS_PER_MINUTE,
  SECONDS_PER_DAY,
  SECONDS_PER_MINUTE,
} from "@allonfire/core/shared/constants/units";

/** Better Auth signs cookies with this secret; 32 chars is its own minimum advice. */
export const SECRET_MIN_LENGTH = 32;

/**
 * How long a Session lasts without a visit. Each visit pushes it back to the
 * full length, at most once per `SESSION_UPDATE_AGE_S`, so only 60 idle days
 * sign a User out.
 */
export const SESSION_EXPIRES_IN_S = 60 * SECONDS_PER_DAY;
/** How often a visit extends the Session: one database write a day at most. */
export const SESSION_UPDATE_AGE_S = SECONDS_PER_DAY;

/** How long a signed session copy in the cookie spares a Postgres read. */
export const COOKIE_CACHE_MAX_AGE_S = 5 * SECONDS_PER_MINUTE;

/**
 * Password guessing gets its own, much smaller bucket than a host's global one.
 * Keyed by IP only: IP+email would let one address spray many accounts.
 * The size and window are env (`AUTH_RATE_LIMIT_*`); these are the defaults.
 * 10 leaves room for a household sharing one public IP.
 */
export const DEFAULT_AUTH_RATE_LIMIT_MAX = 10;
export const DEFAULT_AUTH_RATE_LIMIT_WINDOW_MS = 15 * MS_PER_MINUTE;

/**
 * Default for `AUTH_RATE_LIMIT_KEY_PREFIX`: keeps the auth counters
 * apart from the host's global ones in a shared store.
 */
export const DEFAULT_AUTH_RATE_LIMIT_KEY_PREFIX = "auth:";
