import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import type { App, ImageAccess } from "@allonfire/database/enums";
import { prisma } from "@allonfire/database/features/prisma/client";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { imageBodySchema } from "@allonfire/storage/features/image/constants/schemas";
import { IMAGE_FIXTURE } from "@allonfire/storage/features/image/fixtures/constants/files";
import { readFixtureImage } from "@allonfire/storage/features/image/fixtures/utils/read-fixture-image";
import { imagePageBodySchema } from "@allonfire/storage/features/image/hono/constants/schemas";
import { putImageObject } from "@allonfire/storage/features/image/objects/utils/image-objects";
import { IMAGE_SERVER } from "@allonfire/storage/features/image-server/constants/image-server";
import { pictureLink } from "@allonfire/storage/features/image-server/sign";
import { z } from "zod";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps } from "../../../shared/tests/app-deps";
import { ORIGIN, type TestApp } from "../../../shared/tests/sign-in";
import { auth } from "../../auth/auth";
import { imageDeps } from "../image-deps";

export type UploadFile = { bytes: Buffer; name: string };

/**
 * The API with the real auth and Image module. Build one per test: its
 * in-memory rate-limit store then never sees enough sign-ins to refuse one.
 * `stored` collects the key of every object it puts in MinIO.
 */
export const imageTestApp = (stored: string[] = []): TestApp =>
  createApp(
    appDeps({
      auth,
      images: {
        ...imageDeps({ warn: () => undefined }),
        putObject: (key, body) => {
          stored.push(key);
          return putImageObject(key, body);
        },
      },
    })
  );

/**
 * The stored file `key` as a browser gets it: the bucket is closed, so through
 * the image server, signed, at its largest width, as AVIF.
 */
export const fetchObject = (key: string) =>
  fetch(pictureLink({ key, width: Math.max(...IMAGE_SERVER.WIDTHS) }), {
    headers: { [HTTP.HEADER.ACCEPT]: IMAGE.FORMAT.CONTENT_TYPE },
  });

/** An Image Fixture's source file. */
export const fixtureFile = (name: string): UploadFile => ({
  bytes: readFixtureImage(name),
  name,
});

export const jpeg = () => fixtureFile(IMAGE_FIXTURE.FILE.PHOTO);

/**
 * `POST /v1/images`: every file under `file`, and one `meta` entry per file
 * placing it in `apps`; `alt` marks the rows, so a test finds its own.
 */
export function upload(
  app: TestApp,
  cookie: string,
  {
    access,
    alt = { en: "test", it: "test" },
    apps,
    files,
  }: {
    access?: ImageAccess;
    alt?: { en: string; it: string };
    apps: readonly App[];
    files: readonly UploadFile[];
  }
) {
  const form = new FormData();
  for (const { bytes, name } of files) {
    form.append("file", new File([new Uint8Array(bytes)], name));
  }
  form.append(
    "meta",
    stringifyJson(files.map(() => ({ alt, apps, ...(access && { access }) })))
  );
  return app.request(API.PATH.IMAGES, {
    body: form,
    headers: { cookie, origin: ORIGIN },
    method: HTTP.METHOD.POST,
  });
}

/** A 201's Images; any other answer throws. */
export async function uploaded(res: Response) {
  if (res.status !== 201) {
    throw new Error(`upload answered ${res.status}: ${await res.text()}`);
  }
  return z.array(imageBodySchema).parse(await res.json());
}

/**
 * Every key `GET /v1/images` shows, page by page, in order: with `perPage: 1`
 * one request per Image, so a skipped or repeated key shows.
 */
export async function listKeys(
  app: TestApp,
  cookie = "",
  options: { app?: App; perPage?: number } = {},
  page = 1
): Promise<string[]> {
  const query = new URLSearchParams({
    ...(options.app && { app: options.app }),
    ...(options.perPage && { perPage: String(options.perPage) }),
    page: String(page),
  });
  const res = await app.request(`${API.PATH.IMAGES}?${query}`, {
    headers: { cookie, origin: ORIGIN },
  });
  const body = imagePageBodySchema.parse(await res.json());
  // The body names no file: each Image's key is read by its id, in order.
  const keys = await Promise.all(body.images.map(({ id }) => keyOf(id)));
  return page < body.pageCount
    ? [...keys, ...(await listKeys(app, cookie, options, page + 1))]
    : keys;
}

/** The file name an Image is stored under: the API never answers it. */
export const keyOf = async (id: string) =>
  (await prisma.image.findUniqueOrThrow({ where: { id } })).key;

/** The id of the Image stored under `key`. */
export const idOf = async (key: string) =>
  (await prisma.image.findUniqueOrThrow({ where: { key } })).id;

/** The status of that answer: 200, or 404 once gone. */
export const served = async (key: string) => (await fetchObject(key)).status;
