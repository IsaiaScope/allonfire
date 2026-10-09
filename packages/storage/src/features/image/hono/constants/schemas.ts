import { jsonFrom } from "@allonfire/core/shared/utils/json";
import type { App } from "@allonfire/database/enums";
import { appSchema } from "@allonfire/database/features/auth/access/constants/schemas";
import { imageAltSchema } from "@allonfire/database/features/image/alt";
import { z } from "zod";
import { imageBodySchema } from "../../constants/schemas";
import { cursorSchema } from "../utils/cursor";
import {
  DEFAULT_LIST_LIMIT,
  MAX_BATCH,
  MAX_FILES_PER_UPLOAD,
  MAX_LIST_LIMIT,
} from "./limits";

export const imageListBodySchema = z.object({
  images: z.array(imageBodySchema),
  /** Pass as `cursor` for the next page; null on the last page. */
  nextCursor: z.string().nullable(),
});
export type ImageListBody = z.infer<typeof imageListBodySchema>;

/** The Images visible in `app`, or in any App when it is left out. */
export const listQuerySchema = z.object({
  app: appSchema.optional(),
  cursor: cursorSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIST_LIMIT)
    .default(DEFAULT_LIST_LIMIT),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

/** An Image is placed in an App once: a repeat is the client's 400, not a key clash. */
const eachAppOnce = (links: readonly { app: App }[]) =>
  new Set(links.map(({ app }) => app)).size === links.length;
const EACH_APP_ONCE = "names an App more than once";

/** Upload: at least one App, each once; a placement sent without `public` is private. */
const uploadLinksSchema = z
  .array(z.object({ app: appSchema, public: z.boolean().default(false) }))
  .min(1)
  .refine(eachAppOnce, EACH_APP_ONCE);

/**
 * PATCH: the Image's full new list, at least one App, each once. A `public`
 * left out is the route's to resolve against the current placements.
 */
const patchLinksSchema = z
  .array(z.object({ app: appSchema, public: z.boolean().optional() }))
  .min(1)
  .refine(eachAppOnce, EACH_APP_ONCE);

/** One entry per uploaded file, in the same order. */
export const uploadItemSchema = z.object({
  alt: imageAltSchema,
  apps: uploadLinksSchema,
});

/**
 * The form as one list: each file with its own entry. A count mismatch is the
 * client's 400, so no later code needs a fallback for a missing entry.
 */
export const uploadFormSchema = z
  .object({
    file: z.array(z.instanceof(File)).min(1).max(MAX_FILES_PER_UPLOAD),
    meta: jsonFrom("meta must be JSON").pipe(z.array(uploadItemSchema)),
  })
  .transform(({ file, meta }, context) => {
    const items = meta.flatMap((entry, index) => {
      const one = file[index];
      return one ? [{ ...entry, file: one }] : [];
    });
    if (items.length !== file.length || items.length !== meta.length) {
      context.addIssue({
        code: "custom",
        message: "meta needs one entry per file",
        path: ["meta"],
      });
      return z.NEVER;
    }
    return items;
  });
export type UploadItem = z.output<typeof uploadFormSchema>[number];

export const patchBodySchema = z
  .array(
    z.object({
      alt: imageAltSchema.optional(),
      apps: patchLinksSchema.optional(),
      id: z.string().min(1),
    })
  )
  .min(1)
  .max(MAX_BATCH)
  // Each change is checked and resolved against the Image as read: a second
  // change to the same Image would read placements the first one replaced.
  .refine(
    (changes) => new Set(changes.map(({ id }) => id)).size === changes.length,
    "names an Image more than once"
  );
export type PatchChange = z.output<typeof patchBodySchema>[number];

export const deleteBodySchema = z.object({
  /** Takes the Images out of this App only; left out, deletes them everywhere. */
  app: appSchema.optional(),
  ids: z.array(z.string().min(1)).min(1).max(MAX_BATCH),
});
