// @module-tag integration

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import { App, Role } from "@allonfire/database/enums";
import { createImages } from "@allonfire/database/features/image/image.service";
import { prisma } from "@allonfire/database/features/prisma/client";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps } from "../../../shared/tests/app-deps";
import { seedUser } from "../../../shared/tests/seed-user";
import { cookieFor, ORIGIN, type TestApp } from "../../../shared/tests/sign-in";
import { auth } from "../../auth/auth";
import { LAURA } from "../constants/laura";
import { galleryPageBodySchema } from "../constants/schemas";
import { lauraDeps } from "../laura-deps";

// Runs against DATABASE_URL, shared with other test files: the Images marked
// here are this file's own (a key prefix), so the Fixtures stay as they were,
// and the Users live in their own domain.
const PREFIX = "favorites-api-test-";
const DOMAIN = "favorites-api.test";
const FIRST_READER = `first-reader@${DOMAIN}`;
const LATE_READER = `late-reader@${DOMAIN}`;
const LIST = API.PATH.LAURA.FAVORITES;
const MAX_PAGE = 48;

let app: TestApp;
let laura: string;
let office: string;

const photo = async (name: string, apps: App[]) => {
  const [created] = await createImages([
    {
      alt: { en: name, it: name },
      apps,
      blurDataUrl: "data:image/webp;base64,AAAA",
      bytes: 1000,
      height: 600,
      key: `${PREFIX}${name}.avif`,
      uploadedBy: null,
      width: 800,
    },
  ]);
  return created?.id ?? "";
};

const cleanUp = async () => {
  await prisma.image.deleteMany({ where: { key: { startsWith: PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
};

beforeEach(async () => {
  app = createApp(appDeps({ auth, laura: lauraDeps }));
  await cleanUp();
  laura = await photo("in-laura", [App.LAURA]);
  office = await photo("in-office", [App.BACK_OFFICE]);
});

afterAll(async () => {
  await cleanUp();
  await prisma.$disconnect();
});

const send = (method: string, imageId: string, cookie?: string) =>
  app.request(`${LIST}${fillPath(LAURA.FAVORITES.PATH.ONE, { imageId })}`, {
    headers: { origin: ORIGIN, ...(cookie && { cookie }) },
    method,
  });

/** This file's own Images in a User's Favorites, by id. */
const favoritesOf = async (cookie: string) => {
  const res = await app.request(`${LIST}?limit=${MAX_PAGE}`, {
    headers: { cookie, origin: ORIGIN },
  });
  const { items } = galleryPageBodySchema.parse(await res.json());
  const own = await prisma.image.findMany({
    select: { id: true },
    where: { key: { startsWith: PREFIX } },
  });
  return items
    .map(({ id }) => id)
    .filter((id) => own.some((image) => image.id === id));
};

const reader = (email: string) =>
  seedUser(email, "reader", [{ app: App.LAURA, role: Role.USER }]);

describe("a Laura Admin's writes", () => {
  it("reach a User's feed, whether they read before or after the mark, and a clear removes them from both", async () => {
    const adminCookie = await cookieFor(app, FIXTURE.USER.LAURA.ADMIN);
    const early = await cookieFor(app, await reader(FIRST_READER));
    // The first read makes the Profile, so this User is there when the mark lands.
    expect(await favoritesOf(early)).toEqual([]);
    expect((await send(HTTP.METHOD.PUT, laura, adminCookie)).status).toBe(
      HTTP.STATUS.OK
    );
    const late = await cookieFor(app, await reader(LATE_READER));
    expect(await favoritesOf(early)).toEqual([laura]);
    expect(await favoritesOf(late)).toEqual([laura]);
    expect((await send(HTTP.METHOD.DELETE, laura, adminCookie)).status).toBe(
      HTTP.STATUS.OK
    );
    expect(await favoritesOf(early)).toEqual([]);
    expect(await favoritesOf(late)).toEqual([]);
  });

  it("answer 404 for an Image only in the Back Office, leaving no row, and DELETE twice is no error", async () => {
    const adminCookie = await cookieFor(app, FIXTURE.USER.LAURA.ADMIN);
    expect((await send(HTTP.METHOD.PUT, office, adminCookie)).status).toBe(
      HTTP.STATUS.NOT_FOUND
    );
    expect(await prisma.favorite.count({ where: { imageId: office } })).toBe(0);
    await send(HTTP.METHOD.PUT, laura, adminCookie);
    const first = await send(HTTP.METHOD.DELETE, laura, adminCookie);
    const second = await send(HTTP.METHOD.DELETE, laura, adminCookie);
    expect([first.status, second.status]).toEqual([
      HTTP.STATUS.OK,
      HTTP.STATUS.OK,
    ]);
    expect(await prisma.favorite.count({ where: { imageId: laura } })).toBe(0);
  });
});

describe.each([
  ["a Laura User", FIXTURE.USER.LAURA.USER],
  [
    "a Back Office Admin who is no Laura Member",
    FIXTURE.USER.BACK_OFFICE.ADMIN,
  ],
])("%s", (_name, user) => {
  it("is refused on both writes, and the master and the copies stay as they were", async () => {
    const adminCookie = await cookieFor(app, FIXTURE.USER.LAURA.ADMIN);
    await send(HTTP.METHOD.PUT, laura, adminCookie);
    // A copy to watch: a first read makes this reader's Profile, with the
    // master's Favorites. Only theirs is counted, since other test files add
    // and drop their own Members in this shared database while this one runs.
    await favoritesOf(await cookieFor(app, await reader(FIRST_READER)));
    const copiesOf = () =>
      prisma.profileFavorite.count({
        where: {
          imageId: laura,
          profile: { membership: { user: { email: FIRST_READER } } },
        },
      });
    expect(await copiesOf()).toBe(1);
    const cookie = await cookieFor(app, user);
    expect((await send(HTTP.METHOD.DELETE, laura, cookie)).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect((await send(HTTP.METHOD.PUT, office, cookie)).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect(await prisma.favorite.count({ where: { imageId: laura } })).toBe(1);
    expect(await copiesOf()).toBe(1);
    expect(await prisma.favorite.count({ where: { imageId: office } })).toBe(0);
  });
});
