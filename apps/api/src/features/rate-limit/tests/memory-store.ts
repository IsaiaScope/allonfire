import type { RateLimitStore } from "../middleware/rate-limiter";

/**
 * An in-memory `RateLimitStore` whose `hits` tests can read. Like the Redis
 * store, the window's reset time is set by its first hit.
 */
export function memoryStore(): RateLimitStore & { hits: Map<string, number> } {
  const hits = new Map<string, number>();
  const resets = new Map<string, Date>();
  return {
    decrement: () => Promise.resolve(),
    hits,
    increment: (key: string, windowMs: number) => {
      const totalHits = (hits.get(key) ?? 0) + 1;
      hits.set(key, totalHits);
      const resetTime = resets.get(key) ?? new Date(Date.now() + windowMs);
      resets.set(key, resetTime);
      return Promise.resolve({ resetTime, totalHits });
    },
    resetKey: (key: string) => {
      hits.delete(key);
      resets.delete(key);
      return Promise.resolve();
    },
  };
}
