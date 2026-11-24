// @module-tag integration

import { App, Role } from "../../../../../generated/prisma/enums";
import { createImages } from "../../../image/image.service";
import { prisma } from "../../../prisma/client";
import { markFavorite } from "../favorite.service";
import { ensureLauraProfile } from "../profile.service";

// Runs against DATABASE_URL. Rows are keyed by the prefix and removed after.
const PREFIX = "profile-test-";
const UPLOADER = `${PREFIX}uploader`;
const { BACK_OFFICE: OFFICE, LAURA } = App;
const APP_CHECK = /Profile_app_check/;
const MEMBERSHIP_KEY = /Profile_userId_app_fkey/;
const COPY_APP_CHECK = /ProfileFavorite_app_check/;

const photo = async (name: string) => {
  const [created] = await createImages([
    {
      alt: { en: name, it: name },
      apps: [LAURA],
      blurDataUrl: "data:image/webp;base64,AAAA",
      bytes: 1000,
      height: 600,
      key: `${PREFIX}${name}.avif`,
      uploadedBy: UPLOADER,
      width: 800,
    },
  ]);
  return created?.id ?? "";
};

/** A User with the given Memberships. */
const user = async (name: string, apps: App[]) => {
  const id = `${PREFIX}${name}`;
  await prisma.user.create({
    data: {
      email: `${id}@profile-service.test`,
      id,
      memberships: {
        create: apps.map((app) => ({ app, role: Role.USER })),
      },
    },
  });
  return id;
};

const masterIds = async () =>
  (
    await prisma.favorite.findMany({
      orderBy: { imageId: "asc" },
      select: { imageId: true },
    })
  ).map(({ imageId }) => imageId);

const copiesOf = async (userId: string) =>
  (
    await prisma.profileFavorite.findMany({
      orderBy: { imageId: "asc" },
      select: { imageId: true },
      where: { userId },
    })
  ).map(({ imageId }) => imageId);

const profileCount = (userId: string) =>
  prisma.lauraProfile.count({ where: { userId } });

beforeEach(async () => {
  await prisma.image.deleteMany({ where: { key: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: PREFIX } } });
  await prisma.user.create({
    data: { email: "uploader@profile-service.test", id: UPLOADER },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("ensureLauraProfile", () => {
  it("creates the Profile and copies the whole master, then changes nothing the second time", async () => {
    const [a, b] = [await photo("a"), await photo("b")];
    const first = await user("first", [LAURA]);
    // Two Users with Profiles and the master marked through the service.
    const early = await user("early", [LAURA]);
    await ensureLauraProfile(early);
    await markFavorite(a);
    await markFavorite(b);
    expect(await ensureLauraProfile(first)).toBe(true);
    expect(await copiesOf(first)).toEqual(await masterIds());
    expect(await copiesOf(first)).toEqual(expect.arrayContaining([a, b]));
    expect(await ensureLauraProfile(first)).toBe(true);
    expect(await profileCount(first)).toBe(1);
    expect(await copiesOf(first)).toEqual(await masterIds());
  });

  it("answers false for a User with no Laura Membership and writes nothing", async () => {
    const outsider = await user("outsider", [OFFICE]);
    expect(await ensureLauraProfile(outsider)).toBe(false);
    expect(await profileCount(outsider)).toBe(0);
    expect(await copiesOf(outsider)).toEqual([]);
  });

  it("is removed with the Laura Membership, leaving the User and their other Membership", async () => {
    const id = await user("both", [LAURA, OFFICE]);
    await ensureLauraProfile(id);
    await markFavorite(await photo("kept"));
    await ensureLauraProfile(id);
    await prisma.membership.delete({
      where: { userId_app: { app: LAURA, userId: id } },
    });
    expect(await profileCount(id)).toBe(0);
    expect(await copiesOf(id)).toEqual([]);
    expect(await prisma.user.count({ where: { id } })).toBe(1);
    expect(
      await prisma.membership.count({ where: { app: OFFICE, userId: id } })
    ).toBe(1);
  });

  it("is removed with the User", async () => {
    const id = await user("gone", [LAURA]);
    await ensureLauraProfile(id);
    await prisma.user.delete({ where: { id } });
    expect(await profileCount(id)).toBe(0);
    expect(await copiesOf(id)).toEqual([]);
  });

  it("is refused by the database for an App that is not Laura, or a pair with no Membership", async () => {
    const id = await user("checked", [OFFICE]);
    await expect(
      prisma.$executeRaw`INSERT INTO laura."Profile" ("userId", app) VALUES (${id}, 'back-office'::auth."App")`
    ).rejects.toThrow(APP_CHECK);
    await expect(
      prisma.$executeRaw`INSERT INTO laura."Profile" ("userId", app) VALUES (${id}, 'laura'::auth."App")`
    ).rejects.toThrow(MEMBERSHIP_KEY);
    const member = await user("member", [LAURA]);
    await ensureLauraProfile(member);
    const image = await photo("checked");
    await expect(
      prisma.$executeRaw`INSERT INTO laura."ProfileFavorite" ("userId", "imageId", app) VALUES (${member}, ${image}, 'back-office'::auth."App")`
    ).rejects.toThrow(COPY_APP_CHECK);
  });

  it("leaves every Profile's copies equal to the master when marks and first uses interleave", async () => {
    const images = await Promise.all(
      ["c1", "c2", "c3", "c4", "c5", "c6"].map(photo)
    );
    const users = await Promise.all(
      ["u01", "u02", "u03", "u04", "u05", "u06"].map((name) =>
        user(name, [LAURA])
      )
    );
    await Promise.all([
      ...images.map((id) => markFavorite(id)),
      ...users.map((id) => ensureLauraProfile(id)),
    ]);
    const master = await masterIds();
    expect(master).toEqual(expect.arrayContaining(images));
    const copies = await Promise.all(users.map(copiesOf));
    expect(copies).toEqual(users.map(() => master));
  });
});
