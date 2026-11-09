// @module-tag integration
import { prisma } from "../../../prisma/client";
import { FIXTURE } from "../fixtures";
import { seedFixtures } from "../seed-fixtures";

describe("seedFixtures", () => {
  it("holds every Fixture User, and a second run changes nothing", async () => {
    await seedFixtures(prisma);
    const before = await prisma.user.count();
    await seedFixtures(prisma);
    expect(await prisma.user.count()).toBe(before);
    const emails = (
      await prisma.user.findMany({ select: { email: true } })
    ).map(({ email }) => email);
    expect(emails).toEqual(
      expect.arrayContaining(FIXTURE.USERS.map(({ email }) => email))
    );
  });

  it("brings a changed Image Fixture row back to the Fixture", async () => {
    const { alt, key, width } = FIXTURE.IMAGE.PUBLIC_IN_BACK_OFFICE;
    await prisma.image.update({
      data: { alt: { en: "stale", it: "vecchio" }, width: 1 },
      where: { key },
    });
    await seedFixtures(prisma);
    expect(
      await prisma.image.findUniqueOrThrow({
        select: { alt: true, width: true },
        where: { key },
      })
    ).toEqual({ alt, width });
  });

  it("keeps the Fixture's MAIL provider on, with a sender, whatever was changed", async () => {
    const { fromAddress, slot } = FIXTURE.MAIL_PROVIDER;
    await prisma.mailProvider.updateMany({
      data: { enabled: false, fromAddress: "" },
      where: { slot },
    });
    await seedFixtures(prisma);
    expect(
      await prisma.mailProvider.findFirstOrThrow({
        select: { enabled: true, fromAddress: true },
        where: { slot },
      })
    ).toEqual({ enabled: true, fromAddress });
  });
});
