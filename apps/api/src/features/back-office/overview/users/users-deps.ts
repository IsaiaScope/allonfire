import { App } from "@allonfire/database/enums";
import { userStats } from "@allonfire/database/features/auth/user-stats";
import { adminOf } from "../../../../shared/utils/admin-of";
import type { OverviewUsersDeps } from "./utils/deps";

/** The Users overview on the real stack: Prisma, and the Users module's own admin check. */
export const overviewUsersDeps: OverviewUsersDeps = {
  canManage: adminOf(App.BACK_OFFICE),
  userStats,
};
