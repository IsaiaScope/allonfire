import type { CanManage } from "@allonfire/auth/features/hono/guards/utils/manage-guard";
import type { userStats } from "@allonfire/database/features/auth/user-stats";

/** What the Users overview route needs of the stack; tests stub it. */
export type UserUsageDeps = {
  canManage: CanManage;
  userStats: typeof userStats;
};
