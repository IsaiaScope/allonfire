// @module-tag unit
import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { AllowedApp } from "@allonfire/database/enums";
import { IMAGE_PATH } from "../../../shared/constants/paths";
import { imageRecord } from "../../../shared/tests/stub-image-deps";
import { imageBodySchema, imageListBodySchema } from "../constants/schemas";
import { encodeCursor } from "../utils/cursor";
import type { ImageDeps } from "../utils/deps";
import { errorOf, testHost } from "./test-host";

const app = testHost;
const lauraUser = sessionFor({ allowedApps: [AllowedApp.LAURA] });
const otherAppUser = sessionFor({ allowedApps: [] });

describe("GET /v1/images", () => {
  it("lists the App's Images with the next cursor", async () => {
    const listImages = vi.fn<ImageDeps["listImages"]>(async () => [
      imageRecord(),
    ]);
    const res = await app(lauraUser, { listImages }).request(
      `${IMAGE_PATH}?app=${AllowedApp.LAURA}&limit=1`
    );
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      app: AllowedApp.LAURA,
      limit: 1,
    });
    expect(await res.json()).toEqual({
      images: [
        {
          alt: { en: "The sea", it: "Il mare" },
          app: AllowedApp.LAURA,
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
    }).request(`${IMAGE_PATH}?app=${AllowedApp.LAURA}`);
    expect(imageListBodySchema.parse(await res.json()).nextCursor).toBeNull();
  });

  it("lists the Back office's Images", async () => {
    const listImages = vi.fn<ImageDeps["listImages"]>(async () => []);
    const res = await app(sessionFor({ allowedApps: [AllowedApp.ALL] }), {
      listImages,
    }).request(`${IMAGE_PATH}?app=${AllowedApp.BACK_OFFICE}`);
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      app: AllowedApp.BACK_OFFICE,
      limit: 30,
    });
  });

  it("passes the decoded cursor to the service", async () => {
    const listImages = vi.fn<ImageDeps["listImages"]>(async () => []);
    const cursor = {
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
      id: "image-1",
    };
    await app(lauraUser, { listImages }).request(
      `${IMAGE_PATH}?app=${AllowedApp.LAURA}&cursor=${encodeCursor(cursor)}`
    );
    expect(listImages).toHaveBeenCalledWith({
      app: AllowedApp.LAURA,
      cursor,
      limit: 30,
    });
  });

  it.each([
    ["not base64url JSON", "%%%"],
    ["JSON of the wrong shape", Buffer.from("{}").toString("base64url")],
  ])("refuses a cursor that is %s", async (_, cursor) => {
    const res = await app(lauraUser, {}).request(
      `${IMAGE_PATH}?app=${AllowedApp.LAURA}&cursor=${cursor}`
    );
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("VALIDATION_FAILED");
  });

  it("answers 401 without a Session", async () => {
    const res = await app(null, {}).request(
      `${IMAGE_PATH}?app=${AllowedApp.LAURA}`
    );
    expect(res.status).toBe(401);
  });

  it("answers 403 to a User of another App", async () => {
    const res = await app(otherAppUser, {}).request(
      `${IMAGE_PATH}?app=${AllowedApp.LAURA}`
    );
    expect(res.status).toBe(403);
    expect((await errorOf(res)).code).toBe("FORBIDDEN");
  });

  it("refuses app=ALL with a validation problem", async () => {
    const res = await app(lauraUser, {}).request(
      `${IMAGE_PATH}?app=${AllowedApp.ALL}`
    );
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("VALIDATION_FAILED");
  });
  it("reports each invalid field", async () => {
    const res = await app(lauraUser, {}).request(`${IMAGE_PATH}?limit=0`);
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
  it("returns an ALL Image to any signed-in User", async () => {
    const res = await app(otherAppUser, {
      getImage: async () => imageRecord({ app: AllowedApp.ALL }),
    }).request(`${IMAGE_PATH}/image-1`);
    expect(res.status).toBe(200);
    expect(imageBodySchema.parse(await res.json()).app).toBe(AllowedApp.ALL);
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
