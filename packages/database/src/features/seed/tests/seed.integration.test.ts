// @module-tag integration
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import { seed } from "../seed";

const ADMIN = {
  DATABASE_SEED_ADMIN_EMAIL: "seed-admin@allonfire.test",
  DATABASE_SEED_ADMIN_PASSWORD: "seed-admin-password",
} as const;
const KEEP = "keep-me@allonfire.test";

const emails = async () =>
  (await prisma.user.findMany({ select: { email: true } })).map(
    ({ email }) => email
  );
const counts = async () => ({
  images: await prisma.image.count(),
  memberships: await prisma.membership.count(),
  users: await prisma.user.count(),
});

// The Test database already holds every Fixture: the tests measure what the
// seed adds, never absolute counts.
beforeEach(async () => {
  await prisma.user.deleteMany({
    where: { email: ADMIN.DATABASE_SEED_ADMIN_EMAIL },
  });
});

describe("the seed", () => {
  it("adds the Admin and nobody else, Admin in every App", async () => {
    const before = await emails();
    await seed(prisma, ADMIN);
    expect((await emails()).filter((email) => !before.includes(email))).toEqual(
      [ADMIN.DATABASE_SEED_ADMIN_EMAIL]
    );
    const { memberships } = await prisma.user.findUniqueOrThrow({
      select: { memberships: { select: { app: true, role: true } } },
      where: { email: ADMIN.DATABASE_SEED_ADMIN_EMAIL },
    });
    expect(memberships).toHaveLength(objectValues(App).length);
    expect(memberships).toEqual(
      expect.arrayContaining(
        objectValues(App).map((app) => ({ app, role: Role.ADMIN }))
      )
    );
  });

  it("adds no Image row", async () => {
    const before = await prisma.image.count();
    await seed(prisma, ADMIN);
    expect(await prisma.image.count()).toBe(before);
  });

  it("changes nothing on a second run", async () => {
    await seed(prisma, ADMIN);
    const before = await counts();
    await seed(prisma, ADMIN);
    expect(await counts()).toEqual(before);
  });

  it("deletes nobody: a User it does not seed stays", async () => {
    await prisma.user.upsert({
      create: { email: KEEP, emailVerified: true, name: "keep" },
      update: {},
      where: { email: KEEP },
    });
    await seed(prisma, ADMIN);
    expect(
      await prisma.user.findUnique({ where: { email: KEEP } })
    ).not.toBeNull();
  });

  it("prints nothing: a CLI that seeds hands its stdout to a shell", async () => {
    const printed = vi.spyOn(console, "log");
    await seed(prisma, ADMIN);
    expect(printed).not.toHaveBeenCalled();
  });
});
