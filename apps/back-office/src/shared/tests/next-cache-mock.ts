/**
 * `next/cache` as a test without Next's server sees it, each call recorded:
 * `vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"))`.
 */
export const cacheLife = vi.fn();
export const cacheTag = vi.fn();
export const updateTag = vi.fn();
export const refresh = vi.fn();
