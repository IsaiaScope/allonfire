import { jsonFrom } from "@allonfire/core/shared/utils/json";
import {
  allowedAppSchema,
  appSchema,
} from "@allonfire/database/features/auth/access/constants/schemas";
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

/** A caller lists for its own App; ALL Images come with every App's list. */
export const listQuerySchema = z.object({
  app: appSchema,
  cursor: cursorSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIST_LIMIT)
    .default(DEFAULT_LIST_LIMIT),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

/** One entry per uploaded file, in the same order. */
export const uploadItemSchema = z.object({
  alt: imageAltSchema,
  app: allowedAppSchema,
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
      app: allowedAppSchema.optional(),
      id: z.string().min(1),
    })
  )
  .min(1)
  .max(MAX_BATCH);

export const deleteBodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(MAX_BATCH),
});
