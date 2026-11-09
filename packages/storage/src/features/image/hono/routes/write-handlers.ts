import { requireSession } from "@allonfire/auth/features/hono/guards/middleware/require-session";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import {
  invalidHook,
  payloadTooLarge,
} from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { ImageAccess } from "@allonfire/database/enums";
import {
  type AccessUser,
  canManageEverywhere,
} from "@allonfire/database/features/auth/access/access";
import type {
  ImageChange,
  ImagePlacementsById,
} from "@allonfire/database/features/image/image.service";
import { bodyLimit } from "hono/body-limit";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { IMAGE } from "../../constants/image";
import { deleteLeftovers } from "../../objects/utils/delete-leftovers";
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
import { notFoundOnUnknownIds } from "../utils/errors";
import { toImageBody } from "../utils/image-body";
import { prepareAll, storeAll, uploadTimeout } from "../utils/upload-batch";
import { deleteRoute, patchRoute, uploadRoute } from "./routes";

/**
 * Every write needs a Session (401 without) and is checked per Image and
 * per App (ADR 0020, `../utils/access`): a parse, a check and a call.
 */
const factory = createFactory<AuthEnv>();

/** Deletes files no row points at, if any; a failure is logged, never answered. */
const cleanUp = (deps: ImageDeps, keys: readonly string[]) =>
  deleteLeftovers({
    event: IMAGE.LOG_EVENT.CLEANUP_FAILED,
    keys,
    log: deps.log,
    reason: IMAGE.LOG_MESSAGE.CLEANUP_FAILED,
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
        throw payloadTooLarge(IMAGE.LIMIT.UPLOAD_BYTES);
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
        throw payloadTooLarge(IMAGE.LIMIT.FILE_BYTES);
      }
      const prepared = await prepareAll(deps, items);

      const budget = c.get(IMAGE.VAR.UPLOAD_BUDGET);
      budget.throwIfAborted();
      const images = await (async () => {
        try {
          await storeAll(deps, prepared);
          // Past the budget, the objects just stored are cleaned up below.
          budget.throwIfAborted();
          return await deps.createImages(
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
        } catch (error) {
          // ponytail: best effort. An object left behind is invisible (no row
          // points at it); a failed cleanup must not hide the original error.
          await cleanUp(
            deps,
            prepared.map(({ key }) => key)
          );
          throw error;
        }
      })();
      // Outside the try: the rows exist now, so nothing here may delete their files.
      await deps.changed();
      const now = new Date();
      return c.json(
        images.map((image) => toImageBody(image, now)),
        HTTP.STATUS.CREATED
      );
    }
  );

/**
 * New file names, already copied, for each public Image the batch makes
 * private: its never-expiring links must die with the change, so the change
 * points it at the copy (`authorisePatch`) and the file the locked row named
 * goes after (another change may have renamed it since this read). Only
 * for an Image the User may change everywhere, as read now: a refused change
 * copies nothing; one refused later, under the lock, has its copy deleted.
 * When any read or copy fails, every copy already made is deleted (logged
 * if that fails too) before the first failure is thrown.
 */
const copiesForPrivate = async (
  deps: ImageDeps,
  user: AccessUser,
  changes: readonly PatchChange[]
): Promise<Map<string, string>> => {
  const turning = changes.filter(
    ({ access }) => access === ImageAccess.PRIVATE
  );
  const settled = await Promise.allSettled(
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
      return [[id, to] as const];
    })
  );
  const copied = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
  const failed = settled.find((result) => result.status === "rejected");
  if (failed) {
    await cleanUp(
      deps,
      copied.map(([, to]) => to)
    );
    throw failed.reason;
  }
  return new Map(copied);
};

export const patchHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    patchRoute,
    requireSession(),
    validator("json", patchBodySchema, invalidHook),
    async (c) => {
      const changes = c.req.valid("json");
      const { user } = c.get(AUTH.VAR.SESSION);
      const renamed = await copiesForPrivate(deps, user, changes);
      // Worked out inside the write, against the Images it locks, as a
      // delete checks: a placement added since nobody read it is checked too.
      const resolved: ImageChange[] = [];
      // The file each renamed Image's locked row named, now replaced.
      const replaced: string[] = [];
      // Each on the Version it was made on: one changed since throws the 409.
      const images = await deps
        .updateImages(
          changes.map(({ id, version }) => ({ id, version })),
          (current) => {
            resolved.push(...authorisePatch(user, current, changes, renamed));
            replaced.push(
              ...resolved.flatMap(({ id, key }) =>
                key ? (current.get(id)?.key ?? []) : []
              )
            );
            return resolved;
          }
        )
        .catch(async (error: unknown) => {
          await cleanUp(deps, [...renamed.values()]);
          return notFoundOnUnknownIds(error);
        });
      // Any copy not used, then the old file of each Image now private:
      // asked twice, since its public links answer until it is gone.
      const used = new Set(resolved.flatMap(({ key }) => key ?? []));
      await cleanUp(
        deps,
        [...renamed.values()].filter((to) => !used.has(to))
      );
      await deleteLeftovers({
        event: IMAGE.LOG_EVENT.PUBLIC_FILE_LEFT,
        keys: replaced,
        log: deps.log,
        reason: IMAGE.LOG_MESSAGE.PUBLIC_FILE_LEFT,
        remove: deps.deleteObjects,
        retry: true,
      });
      await deps.changed();
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
      const authorise = (current: ImagePlacementsById) =>
        authoriseDelete(user, current, app);
      const { deleted, keys } = await (app
        ? deps.removeImagesFromApp(ids, app, authorise)
        : deps.deleteImages(ids, authorise));
      // Rows first: a leftover object is harmless, a row without its file is
      // a broken Image. So a storage failure here is logged, not answered.
      await deleteLeftovers({
        event: IMAGE.LOG_EVENT.OBJECT_DELETE_FAILED,
        keys,
        log: deps.log,
        reason: IMAGE.LOG_MESSAGE.OBJECT_DELETE_FAILED,
        remove: deps.deleteObjects,
      });
      // A batch of ids already gone moved nothing.
      if (deleted > 0) {
        await deps.changed();
      }
      return c.json({ deleted }, HTTP.STATUS.OK);
    }
  );
