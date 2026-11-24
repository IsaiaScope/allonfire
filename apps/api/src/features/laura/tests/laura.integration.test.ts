// @module-tag integration

import { HTTP } from "@allonfire/core/features/http/constants/http";
import {
  objectFromEntries,
  objectValues,
} from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { prisma } from "@allonfire/database/features/prisma/client";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps } from "../../../shared/tests/app-deps";
import { seedUser, userIdOf } from "../../../shared/tests/seed-user";
import { cookieFor, ORIGIN, type TestApp } from "../../../shared/tests/sign-in";
import { auth } from "../../auth/auth";
import { LAURA } from "../constants/laura";
import { galleryPageBodySchema } from "../constants/schemas";
import { lauraDeps } from "../laura-deps";

// Runs against DATABASE_URL, shared with other test files: lists are cut to the
// Fixtures' own Images, and the first-use Users live in their own domain.
const DOMAIN = "laura-api.test";
const FIRST_USE = `first-use@${DOMAIN}`;
const REVOKED = `revoked@${DOMAIN}`;
const { FAVORITES, GALLERY } = API.PATH.LAURA;
const FIXTURE_KEYS: string[] = [
  FIXTURE.IMAGE.IN_BOTH_APPS.key,
  FIXTURE.IMAGE.PRIVATE_IN_LAURA.key,
];

let app: TestApp;
const removeOwnUsers = () =>
  prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });

beforeEach(async () => {
  app = createApp(appDeps({ auth, laura: lauraDeps }));
  await removeOwnUsers();
});

afterAll(async () => {
  await removeOwnUsers();
  await prisma.$disconnect();
});

const get = (path: string, cookie?: string) =>
  app.request(path, {
    headers: { origin: ORIGIN, ...(cookie && { cookie }) },
  });

const readPage = async (path: string, cookie: string) => {
  const res = await get(path, cookie);
  // A refusal is a problem document, which this schema rejects.
  return galleryPageBodySchema.parse(await res.json());
};

/** The ids of the Fixture Images, by key. */
const fixtureIds = async () =>
  objectFromEntries(
    (
      await prisma.image.findMany({
        select: { id: true, key: true },
        where: { key: { in: FIXTURE_KEYS } },
      })
    ).map(({ id, key }) => [key, id])
  );

describe("the Gallery on the Fixtures", () => {
  it("lists the Fixture Laura Images, the Favorite flagged and the other not", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.LAURA.USER);
    const ids = await fixtureIds();
    const { items } = await readPage(
      `${GALLERY}?limit=${LAURA.GALLERY.LIMIT.MAX}`,
      cookie
    );
    const own = items.filter(({ id }) => objectValues(ids).includes(id));
    expect(
      objectFromEntries(own.map(({ id, favorite }) => [id, favorite]))
    ).toEqual({
      [ids[FIXTURE.IMAGE.IN_BOTH_APPS.key] ?? ""]: true,
      [ids[FIXTURE.IMAGE.PRIVATE_IN_LAURA.key] ?? ""]: false,
    });
  });

  it("pages through every Image once with limit=1", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.LAURA.USER);
    // Each cursor comes from the page before, so the pages are read one after the other.
    const readFrom = async (path: string, left: number): Promise<string[]> => {
      const { items, nextCursor } = await readPage(path, cookie);
      const ids = items.map(({ id }) => id);
      if (!nextCursor || left === 0) {
        return ids;
      }
      return [
        ...ids,
        ...(await readFrom(
          `${GALLERY}?limit=1&cursor=${nextCursor}`,
          left - 1
        )),
      ];
    };
    const seen = await readFrom(`${GALLERY}?limit=1`, 500);
    expect(new Set(seen).size).toBe(seen.length);
    const ids = await fixtureIds();
    expect(seen).toEqual(expect.arrayContaining(objectValues(ids)));
  });

  it("refuses a Back Office Admin who is no Laura Member", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    expect((await get(GALLERY, cookie)).status).toBe(HTTP.STATUS.FORBIDDEN);
    expect((await get(FAVORITES, cookie)).status).toBe(HTTP.STATUS.FORBIDDEN);
  });

  it("lists the Fixture Favorite in the Favorites, and not the other Fixture Image", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.LAURA.USER);
    const ids = await fixtureIds();
    const { items } = await readPage(
      `${FAVORITES}?limit=${LAURA.GALLERY.LIMIT.MAX}`,
      cookie
    );
    const own = items.filter(({ id }) => objectValues(ids).includes(id));
    expect(own.map(({ id }) => id)).toEqual([
      ids[FIXTURE.IMAGE.IN_BOTH_APPS.key],
    ]);
    expect(own.every(({ favorite }) => favorite)).toBe(true);
  });
});

describe("the first use", () => {
  const laura = (email: string) =>
    seedUser(email, "first-use", [{ app: App.LAURA, role: Role.USER }]);

  it("makes the caller's Profile on the first read, copying the Fixture Favorite, and nothing more on the second", async () => {
    const user = await laura(FIRST_USE);
    const userId = await userIdOf(user);
    expect(await prisma.lauraProfile.count({ where: { userId } })).toBe(0);
    const cookie = await cookieFor(app, user);
    const ids = await fixtureIds();
    const first = await readPage(
      `${GALLERY}?limit=${LAURA.GALLERY.LIMIT.MAX}`,
      cookie
    );
    expect(await prisma.lauraProfile.count({ where: { userId } })).toBe(1);
    const flagged = first.items
      .filter(({ favorite }) => favorite)
      .map(({ id }) => id);
    expect(flagged).toContain(ids[FIXTURE.IMAGE.IN_BOTH_APPS.key]);
    expect(flagged).not.toContain(ids[FIXTURE.IMAGE.PRIVATE_IN_LAURA.key]);
    // Other test files mark their own Images in this shared database: count the Fixtures' only.
    const fixtureCopies = () =>
      prisma.profileFavorite.count({
        where: { imageId: { in: objectValues(ids) }, userId },
      });
    const copies = await fixtureCopies();
    await readPage(FAVORITES, cookie);
    expect(await prisma.lauraProfile.count({ where: { userId } })).toBe(1);
    expect(await fixtureCopies()).toBe(copies);
  });

  it("answers 403 to a Laura User whose Membership is gone though their Session is live, and makes no Profile", async () => {
    const user = await laura(REVOKED);
    const userId = await userIdOf(user);
    const cookie = await cookieFor(app, user);
    await prisma.membership.deleteMany({ where: { app: App.LAURA, userId } });
    expect((await get(GALLERY, cookie)).status).toBe(HTTP.STATUS.FORBIDDEN);
    expect((await get(FAVORITES, cookie)).status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(await prisma.lauraProfile.count({ where: { userId } })).toBe(0);
  });
});
