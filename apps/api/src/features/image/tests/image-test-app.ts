import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { prisma } from "@allonfire/database";
import type { App } from "@allonfire/database/enums";
import type { ImageLink } from "@allonfire/database/features/auth/access/access";
import { env } from "@allonfire/storage/environment/environment";
import { imageBodySchema } from "@allonfire/storage/features/image/constants/schemas";
import { IMAGE_FIXTURE_FILES } from "@allonfire/storage/features/image/fixtures/constants/files";
import { imageListBodySchema } from "@allonfire/storage/features/image/hono/constants/schemas";
import { putImageObject } from "@allonfire/storage/features/image/objects/image-objects";
import { storedObjectUrl } from "@allonfire/storage/shared/utils/stored-object-url";
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

/** What the run's bucket answers anyone for `key`. */
export const fetchObject = (key: string) =>
  fetch(storedObjectUrl(env.STORAGE_ENDPOINT, env.STORAGE_BUCKET, key));

/** An Image Fixture's source file. */
export const fixtureFile = (name: string): UploadFile => ({
  bytes: readFileSync(resolve(IMAGE_FIXTURE_FILES, name)),
  name,
});

export const jpeg = () => fixtureFile("photo.jpg");

/**
 * `POST /v1/images`: every file under `file`, and one `meta` entry per file
 * placing it in `apps`; `alt` marks the rows, so a test finds its own.
 */
export function upload(
  app: TestApp,
  cookie: string,
  {
    alt = { en: "test", it: "test" },
    apps,
    files,
  }: {
    alt?: { en: string; it: string };
    apps: readonly ImageLink[];
    files: readonly UploadFile[];
  }
) {
  const form = new FormData();
  for (const { bytes, name } of files) {
    form.append("file", new File([new Uint8Array(bytes)], name));
  }
  form.append("meta", stringifyJson(files.map(() => ({ alt, apps }))));
  return app.request(API.PATH.IMAGES, {
    body: form,
    headers: { cookie, origin: ORIGIN },
    method: "POST",
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
 * Every key `GET /v1/images` shows, page by page, in order: with `limit: 1`
 * one request per Image, so a skipped or repeated key shows.
 */
export async function listKeys(
  app: TestApp,
  cookie = "",
  options: { app?: App; limit?: number } = {},
  cursor?: string
): Promise<string[]> {
  const query = new URLSearchParams({
    ...(options.app && { app: options.app }),
    ...(options.limit && { limit: String(options.limit) }),
    ...(cursor && { cursor }),
  });
  const res = await app.request(`${API.PATH.IMAGES}?${query}`, {
    headers: { cookie, origin: ORIGIN },
  });
  const { images, nextCursor } = imageListBodySchema.parse(await res.json());
  const keys = images.map(({ key }) => key);
  return nextCursor
    ? [...keys, ...(await listKeys(app, cookie, options, nextCursor))]
    : keys;
}

/** The id of the Image stored under `key`. */
export const idOf = async (key: string) =>
  (await prisma.image.findUniqueOrThrow({ where: { key } })).id;

/** The status of that answer: 200, or 404 once gone. */
export const served = async (key: string) => (await fetchObject(key)).status;
