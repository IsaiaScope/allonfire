// @module-tag integration
import { prisma } from "../../prisma/client";
import { FIXTURE } from "../fixtures/fixtures";
import { seed } from "../seed";

const ENV = {
  DATABASE_SEED_ADMIN_EMAIL: "seed-admin@allonfire.test",
  DATABASE_SEED_ADMIN_PASSWORD: "seed-admin-password",
  DATABASE_SEED_LAURA_VIEWER_EMAIL: "seed-laura-guest@allonfire.test",
  DATABASE_SEED_LAURA_VIEWER_PASSWORD: "seed-guest-password",
  DATABASE_SEED_MODE: "local",
} as const;
const KEEP = "keep-me@allonfire.test";

describe("the Local seed", () => {
  it("deletes nobody: a User it does not seed stays", async () => {
    await prisma.user.create({
      data: { email: KEEP, emailVerified: true, name: "keep" },
    });
    await seed(prisma, ENV);
    expect(
      await prisma.user.findUnique({ where: { email: KEEP } })
    ).not.toBeNull();
  });

  it("prints nothing: a CLI that seeds hands its stdout to a shell", async () => {
    const printed = vi.spyOn(console, "log");
    await seed(prisma, ENV);
    expect(printed).not.toHaveBeenCalled();
  });

  it("holds every Fixture User, and a second run changes nothing", async () => {
    await seed(prisma, ENV);
    const before = await prisma.user.count();
    await seed(prisma, ENV);
    expect(await prisma.user.count()).toBe(before);
    const emails = (
      await prisma.user.findMany({ select: { email: true } })
    ).map(({ email }) => email);
    expect(emails).toEqual(
      expect.arrayContaining(FIXTURE.USERS.map(({ email }) => email))
    );
  });

  it("brings a changed Image Fixture row back to the Fixture", async () => {
    const { alt, key } = FIXTURE.IMAGE.PUBLIC_IN_BACK_OFFICE;
    await prisma.image.update({
      data: { alt: { en: "stale", it: "vecchio" }, width: 1 },
      where: { key },
    });
    await seed(prisma, ENV);
    expect(
      await prisma.image.findUniqueOrThrow({
        select: { alt: true, width: true },
        where: { key },
      })
    ).toEqual({ alt, width: FIXTURE.IMAGE.PUBLIC_IN_BACK_OFFICE.width });
  });

  it("seeds no Fixture in prod mode", async () => {
    const emails = FIXTURE.USERS.map(({ email }) => email);
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await seed(prisma, { ...ENV, DATABASE_SEED_MODE: "prod" });
    expect(await prisma.user.count({ where: { email: { in: emails } } })).toBe(
      0
    );
  });
});
