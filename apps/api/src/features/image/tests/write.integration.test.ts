// @module-tag integration
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { prisma } from "@allonfire/database";
import { App, ImageAccess } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { imageBodySchema } from "@allonfire/storage/features/image/constants/schemas";
import type {
  deleteBodySchema,
  patchBodySchema,
} from "@allonfire/storage/features/image/hono/constants/schemas";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import { z } from "zod";
import { API } from "../../../shared/constants/api";
import { cookieFor, ORIGIN, type TestApp } from "../../../shared/tests/sign-in";
import {
  imageTestApp,
  jpeg,
  keyOf,
  listKeys,
  served,
  upload,
  uploaded,
} from "./image-test-app";

const BOTH = [App.BACK_OFFICE, App.LAURA];
const BACK_OFFICE_ONLY = [App.BACK_OFFICE];
const BACK_OFFICE_ADMIN = FIXTURE.USER.BACK_OFFICE.ADMIN;
const { ADMIN_EVERYWHERE } = FIXTURE.USER;

let app: TestApp;
beforeEach(() => {
  app = imageTestApp();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * A fresh Image placed in `apps`, public unless said: a test never changes a
 * Fixture others read. Its key is read back: the API never answers it.
 */
const fresh = async (apps: App[], access: ImageAccess = ImageAccess.PUBLIC) => {
  const cookie = await cookieFor(app, ADMIN_EVERYWHERE);
  const [image] = await uploaded(
    await upload(app, cookie, { access, apps, files: [jpeg()] })
  );
  if (!image) {
    throw new Error("the upload returned no Image");
  }
  return { ...image, key: await keyOf(image.id) };
};

const send = async (
  user: { email: string },
  request:
    | { body: z.input<typeof patchBodySchema>; method: "PATCH" }
    | { body: z.input<typeof deleteBodySchema>; method: "DELETE" }
) =>
  app.request(API.PATH.IMAGES, {
    body: stringifyJson(request.body),
    headers: {
      "content-type": HTTP.CONTENT_TYPE.JSON,
      cookie: await cookieFor(app, user),
      origin: ORIGIN,
    },
    method: request.method,
  });
const patch = (
  user: { email: string },
  body: z.input<typeof patchBodySchema>
) => send(user, { body, method: "PATCH" });
const remove = (
  user: { email: string },
  body: z.input<typeof deleteBodySchema>
) => send(user, { body, method: "DELETE" });

describe("changing Images on the real stack", () => {
  it("changes alt only for an Admin of every App the Image is in", async () => {
    const { id } = await fresh(BOTH);
    const alt = { en: "changed", it: "cambiato" };
    expect((await patch(BACK_OFFICE_ADMIN, [{ alt, id }])).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect((await patch(ADMIN_EVERYWHERE, [{ alt, id }])).status).toBe(
      HTTP.STATUS.OK
    );
    expect(
      (await prisma.image.findUniqueOrThrow({ where: { id } })).alt
    ).toEqual(alt);
  });

  it("adds a placement only for an Admin of the App it adds", async () => {
    const { id } = await fresh(BACK_OFFICE_ONLY);
    const apps = [...BACK_OFFICE_ONLY, App.LAURA];
    expect((await patch(BACK_OFFICE_ADMIN, [{ apps, id }])).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect((await patch(ADMIN_EVERYWHERE, [{ apps, id }])).status).toBe(
      HTTP.STATUS.OK
    );
    expect(await prisma.imageApp.count({ where: { imageId: id } })).toBe(2);
  });

  it("making it private kills its public links: hidden from visitors, its old link 404, its new one 200", async () => {
    const { id, key, srcSet } = await fresh(BACK_OFFICE_ONLY);
    const [publicLink] = srcSet;
    expect((await fetch(publicLink?.url ?? "")).status).toBe(HTTP.STATUS.OK);
    const res = await patch(BACK_OFFICE_ADMIN, [
      { access: ImageAccess.PRIVATE, id },
    ]);
    expect(res.status).toBe(HTTP.STATUS.OK);
    const [changed] = z.array(imageBodySchema).parse(await res.json());
    expect(changed?.access).toBe(ImageAccess.PRIVATE);
    expect(await keyOf(id)).not.toBe(key);
    expect(await listKeys(app)).not.toContain(await keyOf(id));
    // Dead once the image cache asked imgproxy again.
    await expect
      .poll(async () => (await fetch(publicLink?.url ?? "")).status, {
        timeout: (IMAGE_SERVER.CACHE_CHECK_SECONDS + 1) * UNIT.MS_PER_SECOND,
      })
      .toBe(HTTP.STATUS.NOT_FOUND);
    const [privateLink] = changed?.srcSet ?? [];
    expect((await fetch(privateLink?.url ?? "")).status).toBe(HTTP.STATUS.OK);
  });

  it("makes an Image public only for an Admin of every App it is in", async () => {
    const { id } = await fresh(BOTH, ImageAccess.PRIVATE);
    const change = [{ access: ImageAccess.PUBLIC, id }];
    expect((await patch(BACK_OFFICE_ADMIN, change)).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect((await patch(ADMIN_EVERYWHERE, change)).status).toBe(HTTP.STATUS.OK);
  });

  it("takes an Image out of one App and keeps it in the other", async () => {
    const { id, key } = await fresh(BOTH);
    const res = await remove(BACK_OFFICE_ADMIN, {
      app: App.BACK_OFFICE,
      ids: [id],
    });
    expect(res.status).toBe(HTTP.STATUS.NO_CONTENT);
    expect(
      await prisma.imageApp.findMany({
        select: { app: true },
        where: { imageId: id },
      })
    ).toEqual([{ app: App.LAURA }]);
    expect(await served(key)).toBe(HTTP.STATUS.OK);
  });

  it("deletes the row and the file with the last placement", async () => {
    const { id, key } = await fresh(BACK_OFFICE_ONLY);
    const res = await remove(BACK_OFFICE_ADMIN, {
      app: App.BACK_OFFICE,
      ids: [id],
    });
    expect(res.status).toBe(HTTP.STATUS.NO_CONTENT);
    expect(await prisma.image.findUnique({ where: { id } })).toBeNull();
    expect(await served(key)).toBe(HTTP.STATUS.NOT_FOUND);
  });

  it("deletes everywhere only for an Admin of every App", async () => {
    const { id, key } = await fresh(BOTH);
    expect((await remove(BACK_OFFICE_ADMIN, { ids: [id] })).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect((await remove(ADMIN_EVERYWHERE, { ids: [id] })).status).toBe(
      HTTP.STATUS.NO_CONTENT
    );
    expect(await prisma.image.findUnique({ where: { id } })).toBeNull();
    expect(await served(key)).toBe(HTTP.STATUS.NOT_FOUND);
  });
});
