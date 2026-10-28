import { requireSession } from "@allonfire/auth/features/hono/guards/middleware/require-session";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { invalidHook } from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { ImageAccess } from "@allonfire/database/enums";
import {
  type AccessUser,
  canManageEverywhere,
} from "@allonfire/database/features/auth/access/access";
import type {
  ImageChange,
  ImageLinksById,
} from "@allonfire/database/features/image/image.service";
import { bodyLimit } from "hono/body-limit";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { IMAGE } from "../../constants/image";
import { deleteLeftovers } from "../../objects/delete-leftovers";
import { imageKey } from "../../utils/image-key";
import {
  deleteBodySchema,
  type PatchChange,
  patchBodySchema,
  toUploadItems,
  uploadFormSchema,
} from "../constants/schemas";
import {
  authoriseDelete,
  authorisePatch,
  authoriseUpload,
  authoriseUploader,
} from "../utils/access";
import type { ImageDeps } from "../utils/deps";
import { notFoundOnUnknownIds, tooLarge } from "../utils/errors";
import { toImageBody } from "../utils/image-body";
import { prepareAll, storeAll, uploadTimeout } from "../utils/upload-batch";
import { deleteRoute, patchRoute, uploadRoute } from "./routes";

/**
 * Every write needs a Session (401 without) and is checked per Image and
 * per App (ADR 0020, `../utils/access`): a parse, a check and a call.
 */
const factory = createFactory<AuthEnv>();

const LOG_MESSAGE = {
  CLEANUP_FAILED: "image cleanup failed",
  OBJECT_DELETE_FAILED: "image object delete failed",
  /** The old file of an Image made private: its public links still answer
   *  until it is deleted, so this one is deleted by hand. */
  PUBLIC_FILE_LEFT: "public image file left behind after making it private",
} as const;

/** Deletes files no row points at, if any; a failure is logged, never answered. */
const cleanUp = (deps: ImageDeps, keys: readonly string[]) =>
  deleteLeftovers({
    keys,
    log: deps.log,
    reason: LOG_MESSAGE.CLEANUP_FAILED,
    remove: deps.deleteObjects,
  });

export const uploadHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    uploadRoute,
    requireSession(),
    (c, next) => {
      authoriseUploader(c.get(AUTH.VAR.SESSION).user);
      return next();
    },
    uploadTimeout,
    bodyLimit({
      maxSize: IMAGE.LIMIT.UPLOAD_BYTES,
      onError: () => {
        throw tooLarge(IMAGE.LIMIT.UPLOAD_BYTES);
      },
    }),
    // `meta` is JSON text on the wire; the docs show what it holds.
    validator("form", uploadFormSchema, invalidHook, {
      options: { io: "output" },
    }),
    async (c) => {
      const items = toUploadItems(c.req.valid("form"));
      const { user } = c.get(AUTH.VAR.SESSION);
      authoriseUpload(user, items);
      if (items.some(({ file }) => file.size > IMAGE.LIMIT.FILE_BYTES)) {
        throw tooLarge(IMAGE.LIMIT.FILE_BYTES);
      }
      const prepared = await prepareAll(deps, items);

      const budget = c.get(IMAGE.VAR.UPLOAD_BUDGET);
      budget.throwIfAborted();
      try {
        await storeAll(deps, prepared);
        // Past the budget, the objects just stored are cleaned up below.
        budget.throwIfAborted();
        const images = await deps.createImages(
          prepared.map(({ access, alt, apps, image, key }) => ({
            access,
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
        const now = new Date();
        return c.json(
          images.map((image) => toImageBody(image, now)),
          HTTP.STATUS.CREATED
        );
      } catch (error) {
        // ponytail: best effort. An object left behind is invisible (no row
        // points at it); a failed cleanup must not hide the original error.
        await cleanUp(
          deps,
          prepared.map(({ key }) => key)
        );
        throw error;
      }
    }
  );

/**
 * New file names, already copied, for each public Image the batch makes
 * private: its never-expiring links must die with the change, so the change
 * points it at the copy (`authorisePatch`) and the old file goes after. Only
 * for an Image the User may change everywhere, as read now: a refused change
 * copies nothing; one refused later, under the lock, has its copy deleted.
 */
const copiesForPrivate = async (
  deps: ImageDeps,
  user: AccessUser,
  changes: readonly PatchChange[]
): Promise<Map<string, { from: string; to: string }>> => {
  const turning = changes.filter(
    ({ access }) => access === ImageAccess.PRIVATE
  );
  const copied = await Promise.all(
    turning.map(async ({ id }) => {
      const image = await deps.getImage(id);
      if (
        image?.access !== ImageAccess.PUBLIC ||
        !canManageEverywhere(user, image.apps)
      ) {
        return [];
      }
      const to = imageKey();
      await deps.copyObject(image.key, to);
      return [[id, { from: image.key, to }] as const];
    })
  );
  const copies = new Map(copied.flat());
  return copies;
};

export const patchHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    patchRoute,
    requireSession(),
    validator("json", patchBodySchema, invalidHook),
    async (c) => {
      const changes = c.req.valid("json");
      const { user } = c.get(AUTH.VAR.SESSION);
      const copies = await copiesForPrivate(deps, user, changes);
      const renamed = new Map(
        [...copies].map(([id, { to }]) => [id, to] as const)
      );
      // Worked out inside the write, against the Images it locks, as a
      // delete checks: a placement added since nobody read it is checked too.
      const resolved: ImageChange[] = [];
      const images = await deps
        .updateImages(
          changes.map(({ id }) => id),
          (current) => {
            resolved.push(...authorisePatch(user, current, changes, renamed));
            return resolved;
          }
        )
        .catch(async (error: unknown) => {
          await cleanUp(
            deps,
            [...copies.values()].map(({ to }) => to)
          );
          return notFoundOnUnknownIds(error);
        });
      // Any copy not used, then the old file of each Image now private:
      // asked twice, since its public links answer until it is gone.
      const used = new Set(resolved.flatMap(({ key }) => key ?? []));
      const moved = [...copies.values()].filter(({ to }) => used.has(to));
      await cleanUp(
        deps,
        [...copies.values()].flatMap(({ to }) => (used.has(to) ? [] : [to]))
      );
      await deleteLeftovers({
        keys: moved.map(({ from }) => from),
        log: deps.log,
        reason: LOG_MESSAGE.PUBLIC_FILE_LEFT,
        remove: deps.deleteObjects,
        retry: true,
      });
      const now = new Date();
      return c.json(
        images.map((image) => toImageBody(image, now)),
        HTTP.STATUS.OK
      );
    }
  );

export const deleteHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    deleteRoute,
    requireSession(),
    validator("json", deleteBodySchema, invalidHook),
    async (c) => {
      const { app, ids } = c.req.valid("json");
      const { user } = c.get(AUTH.VAR.SESSION);
      // Checked inside the write, like a PATCH.
      const authorise = (current: ImageLinksById) =>
        authoriseDelete(user, current, app);
      const keys = await (app
        ? deps.removeImagesFromApp(ids, app, authorise)
        : deps.deleteImages(ids, authorise)
      ).catch(notFoundOnUnknownIds);
      // Rows first: a leftover object is harmless, a row without its file is
      // a broken Image. So a storage failure here is logged, not answered.
      await deleteLeftovers({
        keys,
        log: deps.log,
        reason: LOG_MESSAGE.OBJECT_DELETE_FAILED,
        remove: deps.deleteObjects,
      });
      return c.body(null, HTTP.STATUS.NO_CONTENT);
    }
  );
