// @module-tag unit
import {
  membershipsIn,
  sessionFor,
} from "@allonfire/auth/shared/tests/stub-auth";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import { App, Role } from "@allonfire/database/enums";
import { IMAGE_PATH } from "../../constants/paths";
import { imageBodySchema } from "../../constants/schemas";
import { imageListBodySchema } from "../constants/schemas";
import { encodeCursor } from "../utils/cursor";
import type { ImageDeps } from "../utils/deps";
import { imageRecord } from "./stub-image-deps";
import { errorOf, testHost } from "./test-host";

const app = testHost;
const lauraUser = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.VIEWER }],
});
const otherAppUser = sessionFor({ memberships: [] });
const visitor: AuthSession | null = null;
const LAURA_PRIVATE = { app: App.LAURA, public: false };
const LAURA_PUBLIC = { app: App.LAURA, public: true };
const noImages = () => vi.fn<ImageDeps["listImages"]>(async () => []);

describe("GET /v1/images", () => {
  it("lists the Images visible in the App with the next cursor", async () => {
    const listImages = vi.fn<ImageDeps["listImages"]>(async () => [
      imageRecord(),
    ]);
    const res = await app(lauraUser, { listImages }).request(
      `${IMAGE_PATH}?app=${App.LAURA}&limit=1`
    );
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      app: App.LAURA,
      enterable: [App.LAURA],
      limit: 1,
    });
    expect(await res.json()).toEqual({
      images: [
        {
          alt: { en: "The sea", it: "Il mare" },
          apps: [LAURA_PRIVATE],
          blurDataUrl: "data:image/webp;base64,AAAA",
          createdAt: "2026-10-01T10:00:00.000Z",
          height: 600,
          id: "image-1",
          key: "0b9a0c3e-0000-4000-8000-000000000001.webp",
          width: 800,
        },
      ],
      nextCursor: encodeCursor({
        createdAt: new Date("2026-10-01T10:00:00.000Z"),
        id: "image-1",
      }),
    });
  });

  it("has no next cursor on a short page", async () => {
    const res = await app(lauraUser, {
      listImages: async () => [imageRecord()],
    }).request(`${IMAGE_PATH}?app=${App.LAURA}`);
    expect(imageListBodySchema.parse(await res.json()).nextCursor).toBeNull();
  });

  it("asks for the Images visible in any App when none is named", async () => {
    const listImages = noImages();
    const res = await app(lauraUser, { listImages }).request(IMAGE_PATH);
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      enterable: [App.LAURA],
      limit: 30,
    });
  });

  it("passes every App an Admin of every App enters", async () => {
    const listImages = noImages();
    await app(sessionFor({ memberships: membershipsIn(Role.ADMIN) }), {
      listImages,
    }).request(`${IMAGE_PATH}?app=${App.BACK_OFFICE}`);
    expect(listImages).toHaveBeenCalledWith({
      app: App.BACK_OFFICE,
      enterable: [App.LAURA, App.BACK_OFFICE],
      limit: 30,
    });
  });

  it("leaves out an App whose floor the User's Role is under", async () => {
    const listImages = noImages();
    await app(
      sessionFor({ memberships: [{ app: App.BACK_OFFICE, role: Role.USER }] }),
      { listImages }
    ).request(`${IMAGE_PATH}?app=${App.BACK_OFFICE}`);
    expect(listImages).toHaveBeenCalledWith({
      app: App.BACK_OFFICE,
      enterable: [],
      limit: 30,
    });
  });

  it("lists for a visitor without a Session, who enters no App", async () => {
    const listImages = noImages();
    const res = await app(visitor, { listImages }).request(
      `${IMAGE_PATH}?app=${App.LAURA}`
    );
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      app: App.LAURA,
      enterable: [],
      limit: 30,
    });
  });

  it("never answers 403: a User who cannot enter the App gets its public Images", async () => {
    const listImages = noImages();
    const res = await app(otherAppUser, { listImages }).request(
      `${IMAGE_PATH}?app=${App.LAURA}`
    );
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      app: App.LAURA,
      enterable: [],
      limit: 30,
    });
  });

  it("passes the decoded cursor to the service", async () => {
    const listImages = noImages();
    const cursor = {
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
      id: "image-1",
    };
    await app(lauraUser, { listImages }).request(
      `${IMAGE_PATH}?app=${App.LAURA}&cursor=${encodeCursor(cursor)}`
    );
    expect(listImages).toHaveBeenCalledWith({
      app: App.LAURA,
      cursor,
      enterable: [App.LAURA],
      limit: 30,
    });
  });
});

describe("GET /v1/images refusals", () => {
  it.each([
    ["not base64url JSON", "%%%"],
    ["JSON of the wrong shape", Buffer.from("{}").toString("base64url")],
  ])("refuses a cursor that is %s", async (_, cursor) => {
    const res = await app(lauraUser, {}).request(
      `${IMAGE_PATH}?app=${App.LAURA}&cursor=${cursor}`
    );
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("VALIDATION_FAILED");
  });

  it("refuses app=ALL with a validation problem", async () => {
    const res = await app(lauraUser, {}).request(`${IMAGE_PATH}?app=ALL`);
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("VALIDATION_FAILED");
  });

  it("reports each invalid field", async () => {
    const res = await app(lauraUser, {}).request(
      `${IMAGE_PATH}?app=ALL&limit=0`
    );
    expect(res.status).toBe(400);
    const body = await errorOf(res);
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.errors?.map(({ path }) => path).sort()).toEqual([
      "app",
      "limit",
    ]);
    expect(body.values).toEqual({ count: 2 });
  });
});

describe("GET /v1/images/:id", () => {
  it("returns an Image of an App the User enters", async () => {
    const res = await app(lauraUser, {
      getImage: async () => imageRecord(),
    }).request(`${IMAGE_PATH}/image-1`);
    expect(res.status).toBe(200);
    expect(imageBodySchema.parse(await res.json()).apps).toEqual([
      LAURA_PRIVATE,
    ]);
  });

  it("returns a public Image to a visitor without a Session", async () => {
    const res = await app(visitor, {
      getImage: async () => imageRecord({ apps: [LAURA_PUBLIC] }),
    }).request(`${IMAGE_PATH}/image-1`);
    expect(res.status).toBe(200);
  });

  it("answers 404 to a visitor for an Image public nowhere", async () => {
    const res = await app(visitor, {
      getImage: async () => imageRecord(),
    }).request(`${IMAGE_PATH}/image-1`);
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("NOT_FOUND");
  });

  it("answers 404 for another App's Image, as if it did not exist", async () => {
    const res = await app(otherAppUser, {
      getImage: async () => imageRecord(),
    }).request(`${IMAGE_PATH}/image-1`);
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("NOT_FOUND");
  });

  it("answers 404 for an unknown id", async () => {
    const res = await app(lauraUser, { getImage: async () => null }).request(
      `${IMAGE_PATH}/missing`
    );
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("NOT_FOUND");
  });
});
