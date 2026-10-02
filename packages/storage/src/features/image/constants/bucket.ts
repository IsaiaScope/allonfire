/** The MinIO bucket every Image lives in (ADR 0013). */
export const IMAGE_BUCKET = "image";

/**
 * One year. An Image's key never changes content (a new upload gets a new
 * key), so its optimized copies can never go stale.
 */
export const IMAGE_CACHE_TTL_SECONDS = 31_536_000;
