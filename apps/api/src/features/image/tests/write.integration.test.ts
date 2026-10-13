// @module-tag integration
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { prisma } from "@allonfire/database";
import { App } from "@allonfire/database/enums";
import type { ImageLink } from "@allonfire/database/features/auth/access/access";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import type {
  deleteBodySchema,
  patchBodySchema,
} from "@allonfire/storage/features/image/hono/constants/schemas";
import type { z } from "zod";
import { API } from "../../../shared/constants/api";
import { cookieFor, ORIGIN, type TestApp } from "../../../shared/tests/sign-in";
import {
  imageTestApp,
  jpeg,
  listKeys,
  served,
  upload,
  uploaded,
} from "./image-test-app";

const BOTH: ImageLink[] = [
  { app: App.BACK_OFFICE, public: false },
  { app: App.LAURA, public: false },
];
const BACK_OFFICE_ONLY: ImageLink[] = [{ app: App.BACK_OFFICE, public: true }];
const BACK_OFFICE_ADMIN = FIXTURE.USER.BACK_OFFICE.ADMIN;
const { ADMIN_EVERYWHERE } = FIXTURE.USER;

let app: TestApp;
beforeEach(() => {
  app = imageTestApp();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** A fresh Image placed in `apps`: a test never changes a Fixture others read. */
const fresh = async (apps: ImageLink[]) => {
  const cookie = await cookieFor(app, ADMIN_EVERYWHERE);
  const [image] = await uploaded(
    await upload(app, cookie, { apps, files: [jpeg()] })
  );
  if (!image) {
    throw new Error("the upload returned no Image");
  }
  return image;
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
    const apps = [...BACK_OFFICE_ONLY, { app: App.LAURA, public: false }];
    expect((await patch(BACK_OFFICE_ADMIN, [{ apps, id }])).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect((await patch(ADMIN_EVERYWHERE, [{ apps, id }])).status).toBe(
      HTTP.STATUS.OK
    );
    expect(await prisma.imageApp.count({ where: { imageId: id } })).toBe(2);
  });

  it("lets an App's Admin make its placement private, hiding it from visitors", async () => {
    const { id, key } = await fresh(BACK_OFFICE_ONLY);
    const apps = [{ app: App.BACK_OFFICE, public: false }];
    expect((await patch(BACK_OFFICE_ADMIN, [{ apps, id }])).status).toBe(
      HTTP.STATUS.OK
    );
    expect(await listKeys(app)).not.toContain(key);
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
