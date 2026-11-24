import type { OverviewStorageDeps } from "../utils/deps";

/**
 * The Storage overview's deps for a test: nobody manages, no bucket is listed and the
 * database is empty. Override what the test is about.
 */
export const stubOverviewStorageDeps = (
  overrides: Partial<OverviewStorageDeps> = {}
): OverviewStorageDeps => ({
  avatars: () => Promise.resolve([]),
  buckets: () => Promise.resolve([]),
  canManage: () => Promise.resolve(false),
  imageStats: () => Promise.resolve({ byApp: [], total: 0, totalBytes: 0 }),
  ...overrides,
});
