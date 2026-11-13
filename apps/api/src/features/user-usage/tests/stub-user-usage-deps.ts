import type { UserUsageDeps } from "../utils/deps";

/** The Users overview's deps for a test: nobody manages and the database is empty. Override what the test is about. */
export const stubUserUsageDeps = (
  overrides: Partial<UserUsageDeps> = {}
): UserUsageDeps => ({
  canManage: () => Promise.resolve(false),
  userStats: () => Promise.resolve({ byApp: [], total: 0 }),
  ...overrides,
});
