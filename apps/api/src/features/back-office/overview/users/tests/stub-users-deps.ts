import type { OverviewUsersDeps } from "../utils/deps";

/** The Users overview's deps for a test: nobody manages and the database is empty. Override what the test is about. */
export const stubOverviewUsersDeps = (
  overrides: Partial<OverviewUsersDeps> = {}
): OverviewUsersDeps => ({
  canManage: () => Promise.resolve(false),
  userStats: () => Promise.resolve({ byApp: [], total: 0 }),
  ...overrides,
});
