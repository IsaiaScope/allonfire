import { userStats } from "@allonfire/database/features/auth/user-stats";
import { canManageUsers } from "../users/user-deps";
import type { UserUsageDeps } from "./utils/deps";

/** The Users overview on the real stack: Prisma, and the Users module's own admin check. */
export const userUsageDeps: UserUsageDeps = {
  canManage: canManageUsers,
  userStats,
};
