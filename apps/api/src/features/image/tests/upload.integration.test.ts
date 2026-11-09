// @module-tag integration

import { randomUUID } from "node:crypto";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { App } from "@allonfire/database/enums";
import { prisma } from "@allonfire/database/features/prisma/client";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IMAGE_FIXTURE } from "@allonfire/storage/features/image/fixtures/constants/files";
import { problemOf } from "../../../shared/tests/problem-of";
import { cookieFor, type TestApp } from "../../../shared/tests/sign-in";
import {
  fetchObject,
  fixtureFile,
  imageTestApp,
  jpeg,
  keyOf,
  served,
  upload,
  uploaded,
} from "./image-test-app";

/** One source file per format `prepareImage` accepts. */
const ACCEPTED = [
  IMAGE_FIXTURE.FILE.PHOTO,
  IMAGE_FIXTURE.FILE.PNG,
  IMAGE_FIXTURE.FILE.PHOTO_WEBP,
  IMAGE_FIXTURE.FILE.PHOTO_AVIF,
  IMAGE_FIXTURE.FILE.HEIC,
];
const IN_BACK_OFFICE = [App.BACK_OFFICE];

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
    const key = await keyOf(image?.id ?? "");
    expect(key.endsWith(IMAGE.FORMAT.EXTENSION)).toBe(true);
    expect(image?.width).toBeGreaterThan(0);
    const object = await fetchObject(key);
    expect(object.headers.get(HTTP.HEADER.CONTENT_TYPE)).toBe(
      IMAGE.FORMAT.CONTENT_TYPE
    );
    expect(stored).toEqual([key]);
  });

  it.each([
    {
      code: IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE,
      file: () => fixtureFile(IMAGE_FIXTURE.FILE.GIF),
      what: "a GIF",
    },
    {
      code: ERROR.CODE.PAYLOAD_TOO_LARGE,
      file: () => ({
        bytes: Buffer.alloc(IMAGE.LIMIT.FILE_BYTES + 1),
        name: "big.jpg",
      }),
      what: "a file over the size limit",
    },
  ])("refuses $what and stores nothing", async ({ code, file }) => {
    const marker = randomUUID();
    const cookie = await cookieFor(app, FIXTURE.USER.BACK_OFFICE.ADMIN);
    const res = await upload(app, cookie, {
      alt: { en: marker, it: marker },
      apps: IN_BACK_OFFICE,
      files: [file()],
    });
    expect((await problemOf(res)).code).toBe(code);
    expect(await rowsMarked(marker)).toBe(0);
    expect(await anyServed()).toBe(false);
  });

  it.each([
    {
      into: [App.BACK_OFFICE],
      status: HTTP.STATUS.FORBIDDEN,
      user: FIXTURE.USER.BACK_OFFICE.USER,
    },
    { into: [App.BACK_OFFICE], status: HTTP.STATUS.UNAUTHORIZED, user: null },
    {
      into: [App.BACK_OFFICE, App.LAURA],
      status: HTTP.STATUS.FORBIDDEN,
      user: FIXTURE.USER.BACK_OFFICE.ADMIN,
    },
  ])(
    "refuses $user.email uploading into $into: $status",
    async ({ into, status, user }) => {
      const cookie = user ? await cookieFor(app, user) : "";
      const res = await upload(app, cookie, {
        apps: into,
        files: [jpeg()],
      });
      expect(res.status).toBe(status);
    }
  );
});
