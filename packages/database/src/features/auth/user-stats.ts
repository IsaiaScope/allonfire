import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../generated/prisma/enums";
import { prisma } from "../prisma/client";

/** How many Users are members of one App, and how many of them are its Admins. */
type UserAppStat = { admins: number; app: App; count: number };

/** Every User once (`total`, one in no App included) and the members of each App that has any. */
export type UserStats = { byApp: UserAppStat[]; total: number };

/**
 * What the Users overview shows, whoever asks: the caller's right to see it
 * is the route's guard. A User in two Apps is a member of each.
 */
export async function userStats(): Promise<UserStats> {
  const [total, members] = await Promise.all([
    prisma.user.count(),
    prisma.membership.groupBy({ _count: { _all: true }, by: ["app", "role"] }),
  ]);
  const rows = new Map<App, UserAppStat>();
  for (const { _count, app, role } of members) {
    const row = rows.get(app) ?? { admins: 0, app, count: 0 };
    row.count += _count._all;
    if (role === Role.ADMIN) {
      row.admins += _count._all;
    }
    rows.set(app, row);
  }
  return {
    byApp: objectValues(App).flatMap((app) => rows.get(app) ?? []),
    total,
  };
}
