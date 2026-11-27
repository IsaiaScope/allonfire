// @module-tag integration
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import { App } from "@allonfire/database/enums";
import { prisma } from "@allonfire/database/features/prisma/client";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { putImageObject } from "@allonfire/storage/features/image/objects/utils/image-objects";
import {
  exifOf,
  legacyAvif,
} from "@allonfire/storage/features/image/tests/exif-image";
import {
  JPEG_SIGNATURE,
  signatureOf,
} from "@allonfire/storage/features/image/tests/jpeg-signature";
import { exportName } from "@allonfire/storage/features/image/utils/export-name";
import { STORAGE } from "@allonfire/storage/shared/constants/paths";
import { API } from "../../../shared/constants/api";
import { cookieFor, ORIGIN, type TestApp } from "../../../shared/tests/sign-in";
import {
  idOf,
  imageTestApp,
  jpeg,
  keyOf,
  upload,
  uploaded,
} from "./image-test-app";

/** Few enough to spend in one test: every test builds its own app, so its own counters. */
const EXPORTS_PER_WINDOW = 3;
// The env is parsed at import: the limit must exist before the imports run.
vi.hoisted(() => {
  process.env.STORAGE_EXPORT_RATE_LIMIT_MAX = "3";
});

const LAURA_USER = FIXTURE.USER.LAURA.USER;
const exportPath = (id: string) =>
  `${API.PATH.IMAGES}${fillPath(STORAGE.PATH.EXPORT, { id })}`;

let app: TestApp;
beforeEach(() => {
  app = imageTestApp();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const exported = (id: string, cookie = "") =>
  app.request(exportPath(id), { headers: { cookie, origin: ORIGIN } });

describe("exporting an Image on the Fixtures", () => {
  it("sends a Laura User a private Laura Image as a JPEG attachment", async () => {
    const cookie = await cookieFor(app, LAURA_USER);
    const id = await idOf(FIXTURE.IMAGE.PRIVATE_IN_LAURA.key);
    const res = await exported(id, cookie);
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(res.headers.get(HTTP.HEADER.CONTENT_TYPE)).toBe(
      IMAGE.EXPORT.CONTENT_TYPE
    );
    const { createdAt } = await prisma.image.findUniqueOrThrow({
      where: { id },
    });
    expect(res.headers.get(HTTP.HEADER.CONTENT_DISPOSITION)).toBe(
      `attachment; filename="${exportName({ createdAt: createdAt.toISOString(), id })}"`
    );
    const body = Buffer.from(await res.arrayBuffer());
    expect(signatureOf(body)).toEqual(JPEG_SIGNATURE);
  });

  it("answers 404 to an Admin who cannot enter the Image's App", async () => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const id = await idOf(FIXTURE.IMAGE.PRIVATE_IN_LAURA.key);
    expect((await exported(id, cookie)).status).toBe(HTTP.STATUS.NOT_FOUND);
  });

  it("answers 401 to a visitor, even for a public Image", async () => {
    const id = await idOf(FIXTURE.IMAGE.PUBLIC_IN_BACK_OFFICE.key);
    expect((await exported(id)).status).toBe(HTTP.STATUS.UNAUTHORIZED);
  });

  it("answers 404 for an id that is not there", async () => {
    const cookie = await cookieFor(app, LAURA_USER);
    expect(
      (await exported("00000000-0000-4000-8000-000000000000", cookie)).status
    ).toBe(HTTP.STATUS.NOT_FOUND);
  });

  it("drops the EXIF of a stored file that carries it", async () => {
    const admin = await cookieFor(app, FIXTURE.USER.LAURA.ADMIN);
    const [image] = await uploaded(
      await upload(app, admin, { apps: [App.LAURA], files: [jpeg()] })
    );
    if (!image) {
      throw new Error("the upload answered no Image");
    }
    // A legacy object written without `prepare-image`.
    const legacy = await legacyAvif();
    await putImageObject(await keyOf(image.id), legacy);
    const res = await exported(image.id, admin);
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await exifOf(legacy)).toBeDefined();
    expect(await exifOf(Buffer.from(await res.arrayBuffer()))).toBeUndefined();
  });
});

describe("the Export's own limit", () => {
  it("answers 429 as a problem document once the window's exports are spent", async () => {
    const cookie = await cookieFor(app, LAURA_USER);
    const id = await idOf(FIXTURE.IMAGE.PRIVATE_IN_LAURA.key);
    const statuses = await Promise.all(
      Array.from(
        { length: EXPORTS_PER_WINDOW },
        async () => (await exported(id, cookie)).status
      )
    );
    expect(statuses).toEqual(
      new Array(EXPORTS_PER_WINDOW).fill(HTTP.STATUS.OK)
    );
    const res = await exported(id, cookie);
    expect(res.status).toBe(HTTP.STATUS.TOO_MANY_REQUESTS);
    expect(res.headers.get(HTTP.HEADER.CONTENT_TYPE)).toContain(
      HTTP.CONTENT_TYPE.PROBLEM_JSON
    );
  });

  it("counts each User apart, even from one address", async () => {
    // `app.request` has no socket: every request here is the same client.
    const first = await cookieFor(app, LAURA_USER);
    const second = await cookieFor(app, FIXTURE.USER.LAURA.ADMIN);
    const id = await idOf(FIXTURE.IMAGE.PRIVATE_IN_LAURA.key);
    await Promise.all(
      Array.from({ length: EXPORTS_PER_WINDOW }, () => exported(id, first))
    );
    expect((await exported(id, first)).status).toBe(
      HTTP.STATUS.TOO_MANY_REQUESTS
    );
    expect((await exported(id, second)).status).toBe(HTTP.STATUS.OK);
  });

  it("counts nothing for a visitor, who keeps getting 401 and takes nobody's allowance", async () => {
    const id = await idOf(FIXTURE.IMAGE.PRIVATE_IN_LAURA.key);
    const statuses = await Promise.all(
      Array.from(
        { length: EXPORTS_PER_WINDOW + 1 },
        async () => (await exported(id)).status
      )
    );
    expect(new Set(statuses)).toEqual(new Set([HTTP.STATUS.UNAUTHORIZED]));
    const cookie = await cookieFor(app, LAURA_USER);
    expect((await exported(id, cookie)).status).toBe(HTTP.STATUS.OK);
  });

  it("counts HEAD too: the router answers it with the Export's own handler", async () => {
    const cookie = await cookieFor(app, LAURA_USER);
    const id = await idOf(FIXTURE.IMAGE.PRIVATE_IN_LAURA.key);
    const head = () =>
      app.request(exportPath(id), {
        headers: { cookie, origin: ORIGIN },
        method: HTTP.METHOD.HEAD,
      });
    await Promise.all(Array.from({ length: EXPORTS_PER_WINDOW }, head));
    expect((await head()).status).toBe(HTTP.STATUS.TOO_MANY_REQUESTS);
  });

  it("leaves a read of the same Image uncounted", async () => {
    const cookie = await cookieFor(app, LAURA_USER);
    const id = await idOf(FIXTURE.IMAGE.PRIVATE_IN_LAURA.key);
    const statuses = await Promise.all(
      Array.from({ length: EXPORTS_PER_WINDOW + 1 }, async () => {
        const res = await app.request(
          `${API.PATH.IMAGES}${fillPath(STORAGE.PATH.ONE, { id })}`,
          {
            headers: { cookie, origin: ORIGIN },
          }
        );
        return res.status;
      })
    );
    expect(new Set(statuses)).toEqual(new Set([HTTP.STATUS.OK]));
  });
});
