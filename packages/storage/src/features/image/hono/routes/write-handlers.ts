import { AUTH_VAR } from "@allonfire/auth/features/hono/constants/variables";
import { requireSession } from "@allonfire/auth/features/hono/guards/middleware/require-session";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import type { ImageLinksById } from "@allonfire/database/features/image/image.service";
import { sValidator } from "@hono/standard-validator";
import { bodyLimit } from "hono/body-limit";
import { createFactory } from "hono/factory";
import { toImageBody } from "../../constants/schemas";
import { MAX_FILE_BYTES, MAX_UPLOAD_BYTES } from "../constants/limits";
import {
  deleteBodySchema,
  patchBodySchema,
  uploadFormSchema,
} from "../constants/schemas";
import {
  authoriseDelete,
  authorisePatch,
  authoriseUpload,
} from "../utils/access";
import type { ImageDeps } from "../utils/deps";
import { notFoundOnUnknownIds, tooLarge } from "../utils/errors";
import {
  prepareAll,
  storeAll,
  UPLOAD_BUDGET,
  uploadTimeout,
} from "../utils/upload-batch";
import { invalid, throwOnInvalid } from "../utils/validation";
import { deleteRoute, patchRoute, uploadRoute } from "./routes";

/**
 * Every write needs a Session (401 without) and is checked per Image and
 * per App (ADR 0020, `../utils/access`): a parse, a check and a call.
 */
const factory = createFactory<AuthEnv>();

const LOG_MESSAGE = {
  CLEANUP_FAILED: "image cleanup failed",
  OBJECT_DELETE_FAILED: "image object delete failed",
} as const;

export const uploadHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    uploadRoute,
    requireSession(),
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
      const { user } = c.get(AUTH_VAR.SESSION);
      authoriseUpload(user, items);
      if (items.some(({ file }) => file.size > MAX_FILE_BYTES)) {
        throw tooLarge(MAX_FILE_BYTES);
      }
      const prepared = await prepareAll(deps, items);

      const budget = c.get(UPLOAD_BUDGET);
      budget.throwIfAborted();
      try {
        await storeAll(deps, prepared);
        // Past the budget, the objects just stored are cleaned up below.
        budget.throwIfAborted();
        const images = await deps.createImages(
          prepared.map(({ alt, apps, image, key }) => ({
            alt,
            apps,
            blurDataUrl: image.blurDataUrl,
            bytes: image.bytes,
            height: image.height,
            key,
            uploadedBy: user.id,
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
    requireSession(),
    sValidator("json", patchBodySchema, throwOnInvalid),
    async (c) => {
      const changes = c.req.valid("json");
      const current = await deps
        .linksOf(changes.map(({ id }) => id))
        .catch(notFoundOnUnknownIds);
      const resolved = authorisePatch(
        c.get(AUTH_VAR.SESSION).user,
        current,
        changes
      );
      const images = await deps
        .updateImages(resolved)
        .catch(notFoundOnUnknownIds);
      return c.json(images.map(toImageBody), HTTP_STATUS.OK);
    }
  );

export const deleteHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    deleteRoute,
    requireSession(),
    sValidator("json", deleteBodySchema, throwOnInvalid),
    async (c) => {
      const { app, ids } = c.req.valid("json");
      const { user } = c.get(AUTH_VAR.SESSION);
      // Checked inside the write, against the placements it locks: one
      // added since nobody read it is checked too.
      const authorise = (current: ImageLinksById) =>
        authoriseDelete(user, current, app);
      const keys = await (app
        ? deps.removeImagesFromApp(ids, app, authorise)
        : deps.deleteImages(ids, authorise)
      ).catch(notFoundOnUnknownIds);
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
