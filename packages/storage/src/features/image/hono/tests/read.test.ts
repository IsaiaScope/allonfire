// @module-tag unit

import {
  membershipsIn,
  sessionFor,
} from "@allonfire/auth/shared/tests/stub-auth";
import { errorOf } from "@allonfire/auth/shared/tests/test-host";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import { App, ImageAccess, Role } from "@allonfire/database/enums";
import { STORAGE } from "../../../../shared/constants/paths";
import { IMAGE_SERVER } from "../../../image-server/constants/image-server";
import { pictureSrcSet, privateLinkExpiry } from "../../../image-server/sign";
import { IMAGE } from "../../constants/image";
import { imageBodySchema } from "../../constants/schemas";
import { imagePageBodySchema } from "../constants/schemas";
import type { ImageDeps } from "../utils/deps";
import {
  imageHost as app,
  imageRecord,
  publicListQuery,
} from "./stub-image-deps";

/** One Image's path, as the module mounts it. */
const onePath = (id: string) =>
  `${STORAGE.PATH.IMAGES}${fillPath(STORAGE.PATH.ONE, { id })}`;

const lauraUser = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.VIEWER }],
});
const otherAppUser = sessionFor({ memberships: [] });
const visitor: AuthSession | null = null;
const NOW = new Date("2026-10-28T10:05:00Z");
/** The Image every read here answers, unless a test says otherwise. */
const RECORD = imageRecord();

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
});
/** What the service answers when nobody sees an Image. */
const NOTHING = { images: [], total: 0, totalBytes: 0 };
const noImages = () => vi.fn<ImageDeps["listImagesPage"]>(async () => NOTHING);

describe("GET /images", () => {
  it("answers a numbered page with its totals", async () => {
    const listImagesPage = vi.fn<ImageDeps["listImagesPage"]>(async () => ({
      images: [imageRecord()],
      total: 61,
      totalBytes: 61_000,
    }));
    const res = await app(lauraUser, { listImagesPage }).request(
      `${STORAGE.PATH.IMAGES}?app=${App.LAURA}&page=2&perPage=30`
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(listImagesPage).toHaveBeenCalledWith({
      app: App.LAURA,
      enterable: [App.LAURA],
      page: 2,
      perPage: 30,
    });
    expect(await res.json()).toEqual({
      images: [
        {
          access: RECORD.access,
          alt: RECORD.alt,
          apps: RECORD.apps,
          blurDataUrl: RECORD.blurDataUrl,
          bytes: RECORD.bytes,
          createdAt: RECORD.createdAt.toISOString(),
          height: RECORD.height,
          id: RECORD.id,
          srcSet: pictureSrcSet(RECORD.key, privateLinkExpiry(NOW)),
          version: RECORD.version,
          width: RECORD.width,
        },
      ],
      page: 2,
      pageCount: 3,
      total: 61,
      totalBytes: 61_000,
    });
  });

  it("asks for the first page of the default size, in any App, when none is named", async () => {
    const listImagesPage = noImages();
    const res = await app(lauraUser, { listImagesPage }).request(
      STORAGE.PATH.IMAGES
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(listImagesPage).toHaveBeenCalledWith({
      enterable: [App.LAURA],
      page: 1,
      perPage: IMAGE.LIMIT.LIST.DEFAULT,
    });
  });
});

describe("GET /images filters and Apps", () => {
  it("reads the access and App fields of the search, and its text, for the service", async () => {
    const listImagesPage = noImages();
    await app(lauraUser, { listImagesPage }).request(
      `${STORAGE.PATH.IMAGES}?search=${encodeURIComponent("access:public app:laura,back_office input:sea")}`
    );
    expect(listImagesPage).toHaveBeenCalledWith({
      accesses: [ImageAccess.PUBLIC],
      apps: [App.LAURA, App.BACK_OFFICE],
      enterable: [App.LAURA],
      page: 1,
      perPage: IMAGE.LIMIT.LIST.DEFAULT,
      text: "sea",
    });
  });

  it("reads a plain word as the text, and drops a field or value it does not know", async () => {
    const listImagesPage = noImages();
    await app(lauraUser, { listImagesPage }).request(
      `${STORAGE.PATH.IMAGES}?search=${encodeURIComponent("access:secret color:red sea")}`
    );
    expect(listImagesPage).toHaveBeenCalledWith({
      enterable: [App.LAURA],
      page: 1,
      perPage: IMAGE.LIMIT.LIST.DEFAULT,
      text: "sea",
    });
  });

  it("keeps the App query an App's own page asks with, beside the search", async () => {
    const listImagesPage = noImages();
    await app(lauraUser, { listImagesPage }).request(
      `${STORAGE.PATH.IMAGES}?app=${App.LAURA}&search=access:private`
    );
    expect(listImagesPage).toHaveBeenCalledWith({
      accesses: [ImageAccess.PRIVATE],
      app: App.LAURA,
      enterable: [App.LAURA],
      page: 1,
      perPage: IMAGE.LIMIT.LIST.DEFAULT,
    });
  });

  it("answers no images, the real totals and a page count past the end", async () => {
    const res = await app(lauraUser, {
      listImagesPage: async () => ({ images: [], total: 61, totalBytes: 7 }),
    }).request(`${STORAGE.PATH.IMAGES}?page=99&perPage=30`);
    expect(imagePageBodySchema.parse(await res.json())).toMatchObject({
      images: [],
      pageCount: 3,
      total: 61,
      totalBytes: 7,
    });
  });

  it("answers pageCount 0 and totalBytes 0 when nothing is visible", async () => {
    const res = await app(lauraUser, {
      listImagesPage: async () => NOTHING,
    }).request(STORAGE.PATH.IMAGES);
    expect(imagePageBodySchema.parse(await res.json())).toMatchObject({
      pageCount: 0,
      totalBytes: 0,
    });
  });

  it("passes every App an Admin of every App enters", async () => {
    const listImagesPage = noImages();
    await app(sessionFor({ memberships: membershipsIn(Role.ADMIN) }), {
      listImagesPage,
    }).request(`${STORAGE.PATH.IMAGES}?app=${App.BACK_OFFICE}`);
    expect(listImagesPage).toHaveBeenCalledWith({
      app: App.BACK_OFFICE,
      enterable: [App.LAURA, App.BACK_OFFICE],
      page: 1,
      perPage: IMAGE.LIMIT.LIST.DEFAULT,
    });
  });

  it("leaves out an App whose floor the User's Role is under", async () => {
    const listImagesPage = noImages();
    await app(
      sessionFor({ memberships: [{ app: App.BACK_OFFICE, role: Role.USER }] }),
      { listImagesPage }
    ).request(`${STORAGE.PATH.IMAGES}?app=${App.BACK_OFFICE}`);
    expect(listImagesPage).toHaveBeenCalledWith(
      publicListQuery(App.BACK_OFFICE)
    );
  });

  // Never 403: whoever cannot enter the App gets its public Images.
  it.each([
    { session: visitor, who: "a visitor without a Session" },
    { session: otherAppUser, who: "a User who cannot enter the App" },
  ])("lists for $who, who enters no App", async ({ session }) => {
    const listImagesPage = noImages();
    const res = await app(session, { listImagesPage }).request(
      `${STORAGE.PATH.IMAGES}?app=${App.LAURA}`
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(listImagesPage).toHaveBeenCalledWith(publicListQuery(App.LAURA));
  });
});

describe("GET /images refusals", () => {
  it.each(["0", "-1", "abc", String(IMAGE.LIMIT.MAX_PAGE + 1)])(
    "refuses page=%s",
    async (page) => {
      const res = await app(lauraUser, {}).request(
        `${STORAGE.PATH.IMAGES}?page=${page}`
      );
      expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
      expect((await errorOf(res)).code).toBe(ERROR.CODE.VALIDATION_FAILED);
    }
  );

  it("refuses app=ALL with a validation problem", async () => {
    const res = await app(lauraUser, {}).request(
      `${STORAGE.PATH.IMAGES}?app=ALL`
    );
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.VALIDATION_FAILED);
  });

  it("reports each invalid field", async () => {
    const res = await app(lauraUser, {}).request(
      `${STORAGE.PATH.IMAGES}?app=ALL&perPage=0`
    );
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    const body = await errorOf(res);
    expect(body.code).toBe(ERROR.CODE.VALIDATION_FAILED);
    expect(body.errors?.map(({ path }) => path).sort()).toEqual([
      "app",
      "perPage",
    ]);
    expect(body.values).toEqual({ count: 2 });
  });
});

describe("GET /images/:id", () => {
  it("returns an Image of an App the User enters", async () => {
    const res = await app(lauraUser, {
      getImage: async () => imageRecord(),
    }).request(onePath(RECORD.id));
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(imageBodySchema.parse(await res.json()).apps).toEqual([App.LAURA]);
  });

  it("signs a private Image's links for the hour, one per width", async () => {
    const res = await app(lauraUser, {
      getImage: async () => imageRecord(),
    }).request(onePath(RECORD.id));
    const { srcSet } = imageBodySchema.parse(await res.json());
    expect(srcSet.map(({ width }) => width)).toEqual([...IMAGE_SERVER.WIDTHS]);
    const expiry = privateLinkExpiry(NOW).getTime() / UNIT.MS_PER_SECOND;
    for (const { url } of srcSet) {
      expect(url).toContain(`/exp:${expiry}/`);
    }
  });

  it("gives a public Image four links that never expire", async () => {
    const res = await app(visitor, {
      getImage: async () => imageRecord({ access: ImageAccess.PUBLIC }),
    }).request(onePath(RECORD.id));
    const { srcSet } = imageBodySchema.parse(await res.json());
    expect(srcSet).toHaveLength(IMAGE_SERVER.WIDTHS.length);
    for (const { url } of srcSet) {
      expect(url).not.toContain("/exp:");
    }
  });

  it("returns a public Image to a visitor without a Session", async () => {
    const res = await app(visitor, {
      getImage: async () => imageRecord({ access: ImageAccess.PUBLIC }),
    }).request(onePath(RECORD.id));
    expect(res.status).toBe(HTTP.STATUS.OK);
  });

  it.each([
    { image: "a private Image", session: visitor, who: "a visitor" },
    { image: "another App's Image", session: otherAppUser, who: "a User" },
  ])(
    "answers 404 to $who for $image, as if it did not exist",
    async ({ session }) => {
      const res = await app(session, {
        getImage: async () => imageRecord(),
      }).request(onePath(RECORD.id));
      expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
      expect((await errorOf(res)).code).toBe(ERROR.CODE.NOT_FOUND);
    }
  );

  it("answers 404 for an unknown id", async () => {
    const res = await app(lauraUser, { getImage: async () => null }).request(
      onePath("missing")
    );
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.NOT_FOUND);
  });
});
