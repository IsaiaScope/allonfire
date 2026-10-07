import { SECONDS_PER_DAY } from "@allonfire/core/shared/constants/units";

/** The MinIO bucket every Image lives in (ADR 0013). */
export const IMAGE_BUCKET = "image";

/**
 * An Image's key never changes content (a new upload gets a new
 * key), so its optimized copies can never go stale.
 */
export const IMAGE_CACHE_TTL_SECONDS = 365 * SECONDS_PER_DAY;
