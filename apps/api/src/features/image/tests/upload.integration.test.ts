// @module-tag integration

import { randomUUID } from "node:crypto";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { prisma } from "@allonfire/database";
import { App } from "@allonfire/database/enums";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { cookieFor, type TestApp } from "../../../shared/tests/sign-in";
import { problemOf } from "../../errors/tests/problem-of";
import {
  fetchObject,
  fixtureFile,
  imageTestApp,
  jpeg,
  served,
  upload,
  uploaded,
} from "./image-test-app";

/** One source file per format `prepareImage` accepts. */
const ACCEPTED = [
  "photo.jpg",
  "graphic.png",
  "photo.webp",
  "photo.avif",
  "colors-no-alpha.heic",
];
const IN_BACK_OFFICE = [{ app: App.BACK_OFFICE, public: true }];

let app: TestApp;
/** The keys this test's app put in MinIO. */
let stored: string[];
beforeEach(() => {
  stored = [];
  app = imageTestApp(stored);
});

/** Whether any object this test's app put is still in MinIO. */
const anyServed = async () =>
  (await Promise.all(stored.map(served))).includes(HTTP.STATUS.OK);

afterAll(async () => {
  await prisma.$disconnect();
});

/** How many rows carry this upload's marker alt. */
const rowsMarked = (marker: string) =>
  prisma.image.count({
    where: { alt: { equals: { en: marker, it: marker } } },
  });

describe("uploading Images on the real stack", () => {
  it.each(ACCEPTED)("stores %s as AVIF with its size", async (name) => {
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const [image] = await uploaded(
      await upload(app, cookie, {
        apps: IN_BACK_OFFICE,
        files: [fixtureFile(name)],
      })
    );
    expect(image?.key.endsWith(IMAGE.FORMAT.EXTENSION)).toBe(true);
    expect(image?.width).toBeGreaterThan(0);
    const object = await fetchObject(`${image?.key}`);
    expect(object.headers.get("content-type")).toBe(IMAGE.FORMAT.CONTENT_TYPE);
    expect(stored).toEqual([image?.key]);
  });

  it("refuses a GIF and stores nothing", async () => {
    const marker = randomUUID();
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const res = await upload(app, cookie, {
      alt: { en: marker, it: marker },
      apps: IN_BACK_OFFICE,
      files: [fixtureFile("animation.gif")],
    });
    expect((await problemOf(res)).code).toBe(
      IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE
    );
    expect(await rowsMarked(marker)).toBe(0);
    expect(await anyServed()).toBe(false);
  });

  it.each([
    {
      into: [App.BACK_OFFICE],
      status: 403,
      user: FIXTURE.USER.BACK_OFFICE.USER,
    },
    { into: [App.BACK_OFFICE], status: 401, user: null },
    {
      into: [App.BACK_OFFICE, App.LAURA],
      status: 403,
      user: FIXTURE.USER.BACK_OFFICE.ADMIN,
    },
  ])(
    "refuses $user.email uploading into $into: $status",
    async ({ into, status, user }) => {
      const cookie = user ? await cookieFor(app, user) : "";
      const res = await upload(app, cookie, {
        apps: into.map((each) => ({ app: each, public: false })),
        files: [jpeg()],
      });
      expect(res.status).toBe(status);
    }
  );

  it("refuses a file over the size limit and stores nothing", async () => {
    const marker = randomUUID();
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const res = await upload(app, cookie, {
      alt: { en: marker, it: marker },
      apps: IN_BACK_OFFICE,
      files: [
        { bytes: Buffer.alloc(IMAGE.LIMIT.FILE_BYTES + 1), name: "big.jpg" },
      ],
    });
    expect((await problemOf(res)).code).toBe(ERROR.CODE.PAYLOAD_TOO_LARGE);
    expect(await rowsMarked(marker)).toBe(0);
    expect(await anyServed()).toBe(false);
  });
});
