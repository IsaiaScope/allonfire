// @module-tag unit
import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { keysetCursor } from "@allonfire/core/features/search/keyset-cursor";
import { App, ImageAccess, Role } from "@allonfire/database/enums";
import type { GalleryRecord } from "@allonfire/database/features/apps/laura/gallery.service";
import {
  pictureSrcSet,
  privateLinkExpiry,
} from "@allonfire/storage/features/image-server/sign";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { problemOf } from "../../../shared/tests/problem-of";
import { LAURA } from "../constants/laura";
import { galleryPageBodySchema } from "../constants/schemas";
import type { LauraDeps } from "../utils/deps";
import { stubLauraDeps } from "./stub-laura-deps";

const LAURA_USER = {
  memberships: [{ app: App.LAURA, role: Role.USER }],
};
const LAURA_ADMIN = {
  memberships: [{ app: App.LAURA, role: Role.ADMIN }],
};
const BACK_OFFICE_ADMIN = {
  memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
};
const NO_MEMBERSHIP = { memberships: [] };
const NOW = new Date("2026-11-20T10:30:00.000Z");
const AT = new Date("2026-11-19T08:00:00.000Z");

const record = (overrides: Partial<GalleryRecord> = {}): GalleryRecord => ({
  access: ImageAccess.PUBLIC,
  alt: { en: "A sea", it: "Un mare" },
  blurDataUrl: "data:image/webp;base64,AAAA",
  favorite: false,
  height: 600,
  id: "image-1",
  key: "11111111-1111-1111-1111-111111111111.avif",
  width: 800,
  ...overrides,
});

const PATHS = [
  { base: LAURA.GALLERY.PATH.BASE, dep: "listGalleryPage" },
  { base: LAURA.FAVORITES.PATH.BASE, dep: "listFavoritesPage" },
] as const;

const appWith = (
  overrides: Partial<LauraDeps>,
  session: ReturnType<typeof sessionFor> | null
) =>
  createApp(
    appDeps({
      auth: apiAuth({ getSession: () => Promise.resolve(session) }),
      laura: stubLauraDeps(overrides),
    })
  );

const urlOf = (base: string, query = "") =>
  `${API.PATH.LAURA.BASE}${base}${query}`;

describe.each(PATHS)("GET /laura$base: the door", ({ base, dep }) => {
  it("answers 401 without a Session", async () => {
    const res = await appWith({}, null).request(urlOf(base));
    expect(res.status).toBe(HTTP.STATUS.UNAUTHORIZED);
  });

  it.each([
    ["a Back Office Admin who is no Laura Member", BACK_OFFICE_ADMIN],
    ["a User with no Membership", NO_MEMBERSHIP],
  ])("answers 403 to %s, and reads nothing", async (_name, user) => {
    const ensureProfile = vi.fn(() => Promise.resolve(true));
    const list = vi.fn(() => Promise.resolve({ images: [], next: null }));
    const res = await appWith(
      { ensureProfile, [dep]: list },
      sessionFor(user)
    ).request(urlOf(base));
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(ensureProfile).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it.each([
    ["a Laura User", LAURA_USER],
    ["a Laura Admin", LAURA_ADMIN],
  ])("answers 200 to %s with a page that parses", async (_name, user) => {
    const res = await appWith(
      { [dep]: () => Promise.resolve({ images: [record()], next: null }) },
      sessionFor(user)
    ).request(urlOf(base));
    expect(res.status).toBe(HTTP.STATUS.OK);
    const body = galleryPageBodySchema.parse(await res.json());
    expect(body.items).toHaveLength(1);
    expect(body.items.map(({ favorite }) => typeof favorite)).toEqual([
      "boolean",
    ]);
  });
});

describe.each(PATHS)("GET /laura$base: the first use", ({ base, dep }) => {
  it("makes sure the caller has a Profile once, before the list, and gives the list their id", async () => {
    const order: string[] = [];
    const ensureProfile = vi.fn(() => {
      order.push("ensure");
      return Promise.resolve(true);
    });
    const list = vi.fn(() => {
      order.push("list");
      return Promise.resolve({ images: [], next: null });
    });
    await appWith(
      { ensureProfile, [dep]: list },
      sessionFor({ ...LAURA_USER, id: "user-7" })
    ).request(urlOf(base));
    expect(ensureProfile).toHaveBeenCalledExactlyOnceWith("user-7");
    expect(order).toEqual(["ensure", "list"]);
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-7" })
    );
  });

  it("answers 403 when the Profile cannot be made (no Laura Membership now), and lists nothing", async () => {
    const list = vi.fn(() => Promise.resolve({ images: [], next: null }));
    const res = await appWith(
      { ensureProfile: () => Promise.resolve(false), [dep]: list },
      sessionFor(LAURA_USER)
    ).request(urlOf(base));
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect((await problemOf(res)).code).toBe(ERROR.CODE.FORBIDDEN);
    expect(list).not.toHaveBeenCalled();
  });
});

describe.each(PATHS)("GET /laura$base: the page", ({ base, dep }) => {
  it("signs a private picture for the hour and a public one without an end", async () => {
    vi.useFakeTimers({ now: NOW });
    try {
      const priv = record({
        access: ImageAccess.PRIVATE,
        id: "private",
        key: "22222222-2222-2222-2222-222222222222.avif",
      });
      const pub = record({ id: "public" });
      const res = await appWith(
        {
          [dep]: () => Promise.resolve({ images: [priv, pub], next: null }),
        },
        sessionFor(LAURA_USER)
      ).request(urlOf(base));
      const { items } = galleryPageBodySchema.parse(await res.json());
      expect(items[0]?.srcSet).toEqual(
        pictureSrcSet(priv.key, privateLinkExpiry(NOW))
      );
      expect(items[1]?.srcSet).toEqual(pictureSrcSet(pub.key, undefined));
    } finally {
      vi.useRealTimers();
    }
  });

  it("answers the next cursor the dep gave, or null on the last page", async () => {
    const next = { at: AT, id: "image-9" };
    const more = await appWith(
      { [dep]: () => Promise.resolve({ images: [record()], next }) },
      sessionFor(LAURA_USER)
    ).request(urlOf(base));
    expect(galleryPageBodySchema.parse(await more.json()).nextCursor).toBe(
      keysetCursor.encode(next)
    );
    const last = await appWith(
      { [dep]: () => Promise.resolve({ images: [], next: null }) },
      sessionFor(LAURA_USER)
    ).request(urlOf(base));
    expect(
      galleryPageBodySchema.parse(await last.json()).nextCursor
    ).toBeNull();
  });

  it("hands the default limit and no position to the dep on a bare call, and the parsed ones when given", async () => {
    const list = vi.fn(() => Promise.resolve({ images: [], next: null }));
    const app = appWith({ [dep]: list }, sessionFor(LAURA_USER));
    await app.request(urlOf(base));
    expect(list).toHaveBeenLastCalledWith({
      after: undefined,
      limit: LAURA.GALLERY.LIMIT.DEFAULT,
      userId: expect.any(String),
    });
    const cursor = keysetCursor.encode({ at: AT, id: "image-3" });
    await app.request(urlOf(base, `?cursor=${cursor}&limit=5`));
    expect(list).toHaveBeenLastCalledWith({
      after: { at: AT, id: "image-3" },
      limit: 5,
      userId: expect.any(String),
    });
  });

  it.each([
    ["a cursor that is garbage", "?cursor=garbage"],
    ["a limit of 0", "?limit=0"],
    ["a limit above the maximum", `?limit=${LAURA.GALLERY.LIMIT.MAX + 1}`],
  ])("answers 400 for %s", async (_name, query) => {
    const list = vi.fn(() => Promise.resolve({ images: [], next: null }));
    const res = await appWith({ [dep]: list }, sessionFor(LAURA_USER)).request(
      urlOf(base, query)
    );
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect((await problemOf(res)).code).toBe(ERROR.CODE.VALIDATION_FAILED);
    expect(list).not.toHaveBeenCalled();
  });
});
