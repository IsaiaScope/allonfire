// @module-tag integration
import { App, Role } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import { avatarOwners } from "../avatar-owners";

// Runs against DATABASE_URL; the Users made here are removed after.
const DOMAIN = "avatar-owners.test";
const OWNER_IMAGE = "avatar-owners-test-file.avif";
const user = (name: string, image: string | null, apps: App[]) =>
  prisma.user.create({
    data: {
      email: `${name}@${DOMAIN}`,
      image,
      memberships: {
        create: apps.map((app) => ({ app, role: Role.VIEWER })),
      },
      name,
    },
    select: { id: true },
  });

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
});

describe("avatarOwners", () => {
  it("lists the file each User with a picture has, and the Apps they are in", async () => {
    await user("owner", OWNER_IMAGE, [App.LAURA, App.BACK_OFFICE]);
    await user("nobody", null, [App.LAURA]);
    const owners = await avatarOwners();
    const mine = owners.filter(({ image }) => image === OWNER_IMAGE);
    expect(mine).toHaveLength(1);
    expect([...(mine[0]?.apps ?? [])].sort()).toEqual(
      [App.BACK_OFFICE, App.LAURA].sort()
    );
    expect(owners.every(({ image }) => image.length > 0)).toBe(true);
  });
});
