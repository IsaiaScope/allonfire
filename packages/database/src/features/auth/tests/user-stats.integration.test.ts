// @module-tag integration
import { App, Role } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import { userStats } from "../user-stats";

// Runs against DATABASE_URL; the Users made here are removed after.
const DOMAIN = "user-stats.test";
const user = (name: string, apps: App[], role: Role = Role.VIEWER) =>
  prisma.user.create({
    data: {
      email: `${name}@${DOMAIN}`,
      memberships: {
        create: apps.map((app) => ({ app, role })),
      },
      name,
    },
    select: { id: true },
  });
const countOf = (stats: Awaited<ReturnType<typeof userStats>>, app: App) =>
  stats.byApp.find((row) => row.app === app)?.count ?? 0;

const adminsOf = (stats: Awaited<ReturnType<typeof userStats>>, app: App) =>
  stats.byApp.find((row) => row.app === app)?.admins ?? 0;

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
});

describe("userStats", () => {
  it("counts every User once and the members of each App", async () => {
    const before = await userStats();
    await user("both", [App.LAURA, App.BACK_OFFICE]);
    await user("laura", [App.LAURA]);
    await user("nowhere", []);
    const after = await userStats();
    expect(after.total - before.total).toBe(3);
    expect(countOf(after, App.LAURA) - countOf(before, App.LAURA)).toBe(2);
    expect(
      countOf(after, App.BACK_OFFICE) - countOf(before, App.BACK_OFFICE)
    ).toBe(1);
  });

  it("counts the Admins of each App, an Admin in two Apps in both", async () => {
    const before = await userStats();
    await user("boss", [App.LAURA, App.BACK_OFFICE], Role.ADMIN);
    await user("viewer", [App.LAURA]);
    const after = await userStats();
    expect(adminsOf(after, App.LAURA) - adminsOf(before, App.LAURA)).toBe(1);
    expect(
      adminsOf(after, App.BACK_OFFICE) - adminsOf(before, App.BACK_OFFICE)
    ).toBe(1);
    expect(countOf(after, App.LAURA) - countOf(before, App.LAURA)).toBe(2);
  });

  it("lists the Apps in the App enum's order, only those with a member", async () => {
    await user("only-office", [App.BACK_OFFICE]);
    const { byApp } = await userStats();
    const apps = byApp.map(({ app }) => app);
    expect(apps).toEqual(
      [App.LAURA, App.BACK_OFFICE].filter((app) => apps.includes(app))
    );
  });
});
