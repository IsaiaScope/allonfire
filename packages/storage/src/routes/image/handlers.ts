import { randomUUID } from "node:crypto";
import { requireRole } from "@allonfire/auth/features/guards/middleware/require-role";
import { requireSession } from "@allonfire/auth/features/guards/middleware/require-session";
import { AUTH_VAR } from "@allonfire/auth/shared/constants/variables";
import type { AuthEnv } from "@allonfire/auth/shared/types/variables";
import { Role } from "@allonfire/database/enums";
import { ImageNotFoundError } from "@allonfire/database/features/image/image.service";
import { HTTP_STATUS } from "@allonfire/utils/constants/http";
import { MS_PER_SECOND } from "@allonfire/utils/constants/units";
import { CodedError } from "@allonfire/utils/helpers/coded-error";
import { sValidator } from "@hono/standard-validator";
import type { MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { timeout } from "hono/timeout";
import { MAX_INPUT_MEGAPIXELS } from "../../features/image/constants/limits";
import {
  ImageTooLargeError,
  type PreparedImage,
  UnsupportedImageError,
} from "../../features/image/prepare-image";
import { IMAGE_ERROR_CODE } from "./constants/errors";
import {
  MAX_FILE_BYTES,
  MAX_UPLOAD_BYTES,
  UPLOAD_TIMEOUT_MS,
} from "./constants/limits";
import {
  deleteBodySchema,
  type ImageListBody,
  idParamSchema,
  listQuerySchema,
  patchBodySchema,
  toImageBody,
  type UploadItem,
  uploadFormSchema,
} from "./constants/schemas";
import {
  deleteRoute,
  getRoute,
  listRoute,
  patchRoute,
  uploadRoute,
} from "./routes";
import { assertCanSee, canSee } from "./utils/access";
import { encodeCursor } from "./utils/cursor";
import type { ImageDeps } from "./utils/deps";
import { invalid, throwOnInvalid } from "./utils/validation";

const factory = createFactory<AuthEnv>();

export const listHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    listRoute,
    requireSession(),
    sValidator("query", listQuerySchema, throwOnInvalid),
    async (c) => {
      const query = c.req.valid("query");
      assertCanSee(c.get(AUTH_VAR.SESSION), query.app);
      const images = await deps.listImages(query);
      const last = images.at(-1);
      const body = {
        images: images.map(toImageBody),
        nextCursor:
          images.length === query.limit && last ? encodeCursor(last) : null,
      } satisfies ImageListBody;
      return c.json(body, HTTP_STATUS.OK);
    }
  );

export const getHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    getRoute,
    requireSession(),
    sValidator("param", idParamSchema, throwOnInvalid),
    async (c) => {
      const image = await deps.getImage(c.req.valid("param").id);
      // Hidden is missing: a 403 would tell someone outside the App the id exists.
      if (!(image && canSee(c.get(AUTH_VAR.SESSION), image.app))) {
        throw notFound();
      }
      return c.json(toImageBody(image), HTTP_STATUS.OK);
    }
  );

const IMAGE_EXTENSION = ".webp";
const LOG_MESSAGE = {
  CLEANUP_FAILED: "image cleanup failed",
  OBJECT_DELETE_FAILED: "image object delete failed",
} as const;

const notFound = (options?: ErrorOptions) =>
  new CodedError(
    { code: IMAGE_ERROR_CODE.NOT_FOUND, status: HTTP_STATUS.NOT_FOUND },
    options
  );

/** 413 naming the limit that was actually crossed, not a host-wide one. */
const tooLarge = (limit: number) =>
  new CodedError({
    code: IMAGE_ERROR_CODE.PAYLOAD_TOO_LARGE,
    status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
    values: { limit },
  });

/** The service's unknown-id error, as the 404 every other route answers. */
const notFoundOnUnknownIds = (error: unknown): never => {
  if (error instanceof ImageNotFoundError) {
    throw notFound({ cause: error });
  }
  throw error;
};

/** The file bytes as sharp reads them; a decode failure is the client's 415, too many pixels a 413. */
const prepareFile = async (deps: ImageDeps, file: File) => {
  try {
    return await deps.prepare(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    if (error instanceof ImageTooLargeError) {
      throw new CodedError(
        {
          code: IMAGE_ERROR_CODE.IMAGE_TOO_LARGE,
          status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
          values: { limit: MAX_INPUT_MEGAPIXELS },
        },
        { cause: error }
      );
    }
    if (error instanceof UnsupportedImageError) {
      throw new CodedError(
        {
          code: IMAGE_ERROR_CODE.UNSUPPORTED_IMAGE,
          status: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        },
        { cause: error }
      );
    }
    throw error;
  }
};

type PreparedItem = UploadItem & { image: PreparedImage; key: string };

/**
 * One at a time: sharp decodes the whole image, and the VPS has no swap. A
 * reduce chain, so each file waits for the one before it.
 */
const prepareAll = (deps: ImageDeps, items: UploadItem[]) =>
  items.reduce<Promise<PreparedItem[]>>(async (done, item) => {
    const list = await done;
    list.push({
      ...item,
      image: await prepareFile(deps, item.file),
      key: `${randomUUID()}${IMAGE_EXTENSION}`,
    });
    return list;
  }, Promise.resolve([]));

/**
 * Every put settles before anything is cleaned up: with `Promise.all` the
 * first failure cleaned up while other puts were still in flight, and those
 * landed after the delete.
 */
const storeAll = async (deps: ImageDeps, prepared: PreparedItem[]) => {
  const puts = await Promise.allSettled(
    prepared.map(({ image, key }) => deps.putObject(key, image.buffer))
  );
  const failed = puts.find(
    (put): put is PromiseRejectedResult => put.status === "rejected"
  );
  if (failed) {
    throw failed.reason;
  }
};

// Hono's timeout throws only an HTTPException; the host would then name its
// own budget. Rethrown coded, the message names this one.
const TIMED_OUT = new HTTPException(HTTP_STATUS.SERVICE_UNAVAILABLE);
const uploadBudget = timeout(UPLOAD_TIMEOUT_MS, TIMED_OUT);
const uploadTimeout: MiddlewareHandler = async (c, next) => {
  try {
    await uploadBudget(c, next);
  } catch (err) {
    throw err === TIMED_OUT
      ? new CodedError({
          code: IMAGE_ERROR_CODE.TIMEOUT,
          status: HTTP_STATUS.SERVICE_UNAVAILABLE,
          values: { seconds: UPLOAD_TIMEOUT_MS / MS_PER_SECOND },
        })
      : err;
  }
};

export const uploadHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    uploadRoute,
    requireRole(Role.ADMIN),
    uploadTimeout,
    bodyLimit({
      maxSize: MAX_UPLOAD_BYTES,
      onError: () => {
        throw tooLarge(MAX_UPLOAD_BYTES);
      },
    }),
    async (c) => {
      const form = await c.req.parseBody({ all: true });
      // One `file` part parses to a File, several to an array.
      const parsed = uploadFormSchema.safeParse({
        file: [form.file].flat(),
        meta: form.meta,
      });
      if (!parsed.success) {
        throw invalid(parsed.error.issues);
      }
      const items = parsed.data;
      if (items.some(({ file }) => file.size > MAX_FILE_BYTES)) {
        throw tooLarge(MAX_FILE_BYTES);
      }
      const prepared = await prepareAll(deps, items);

      const uploadedBy = c.get(AUTH_VAR.SESSION).user.id;
      try {
        await storeAll(deps, prepared);
        const images = await deps.createImages(
          prepared.map(({ alt, app, image, key }) => ({
            alt,
            app,
            blurDataUrl: image.blurDataUrl,
            bytes: image.bytes,
            height: image.height,
            key,
            uploadedBy,
            width: image.width,
          }))
        );
        return c.json(images.map(toImageBody), HTTP_STATUS.CREATED);
      } catch (error) {
        // ponytail: best effort. An object left behind is invisible (no row
        // points at it); a failed cleanup must not hide the original error.
        const keys = prepared.map(({ key }) => key);
        await deps
          .deleteObjects(keys)
          .catch((cleanup: unknown) =>
            deps.log.warn({ err: cleanup, keys }, LOG_MESSAGE.CLEANUP_FAILED)
          );
        throw error;
      }
    }
  );

export const patchHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    patchRoute,
    requireRole(Role.ADMIN),
    sValidator("json", patchBodySchema, throwOnInvalid),
    async (c) => {
      const images = await deps
        .updateImages(c.req.valid("json"))
        .catch(notFoundOnUnknownIds);
      return c.json(images.map(toImageBody), HTTP_STATUS.OK);
    }
  );

export const deleteHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    deleteRoute,
    requireRole(Role.ADMIN),
    sValidator("json", deleteBodySchema, throwOnInvalid),
    async (c) => {
      const keys = await deps
        .deleteImages(c.req.valid("json").ids)
        .catch(notFoundOnUnknownIds);
      // Rows first: a leftover object is harmless, a row without its file is
      // a broken Image. So a storage failure here is logged, not answered.
      await deps
        .deleteObjects(keys)
        .catch((error: unknown) =>
          deps.log.warn({ err: error, keys }, LOG_MESSAGE.OBJECT_DELETE_FAILED)
        );
      return c.body(null, HTTP_STATUS.NO_CONTENT);
    }
  );
