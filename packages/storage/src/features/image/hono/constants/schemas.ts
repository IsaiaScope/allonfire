import { jsonFrom } from "@allonfire/core/shared/utils/json";
import type { App } from "@allonfire/database/enums";
import { z } from "zod";
import { IMAGE } from "../../constants/image";
import {
  appBodySchema,
  imageAltBodySchema,
  imageBodySchema,
} from "../../constants/schemas";
import { cursorSchema } from "../utils/cursor";

export const imageListBodySchema = z
  .object({
    images: z.array(imageBodySchema),
    /** Pass as `cursor` for the next page; null on the last page. */
    nextCursor: z.string().nullable(),
  })
  .meta({ ref: "ImageList" });
export type ImageListBody = z.infer<typeof imageListBodySchema>;

/** The Images visible in `app`, or in any App when it is left out. */
export const listQuerySchema = z.object({
  app: appBodySchema.optional(),
  cursor: cursorSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(IMAGE.LIMIT.LIST.MAX)
    .default(IMAGE.LIMIT.LIST.DEFAULT),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

/** An Image is placed in an App once: a repeat is the client's 400, not a key clash. */
const eachAppOnce = (links: readonly { app: App }[]) =>
  new Set(links.map(({ app }) => app)).size === links.length;
const EACH_APP_ONCE = "names an App more than once";

/**
 * An Image's placements: at least one App, each once. A `public` left out is
 * the caller's to resolve: private on upload (`toUploadItems`), the current
 * placement's on PATCH (the route).
 */
const linksSchema = z
  .array(z.object({ app: appBodySchema, public: z.boolean().optional() }))
  .min(1)
  .refine(eachAppOnce, EACH_APP_ONCE);

/** One entry per uploaded file, in the same order. */
export const uploadItemSchema = z
  .object({
    alt: imageAltBodySchema,
    apps: linksSchema,
  })
  .meta({ ref: "ImageUpload" });

/**
 * The form: one `file` part per Image and one `meta` part, JSON text with an
 * entry per file. One `file` part arrives as a File, several as an array. A
 * count mismatch is the client's 400.
 */
export const uploadFormSchema = z
  .object({
    file: z.preprocess(
      (value) => [value].flat(),
      z.array(z.file()).min(1).max(IMAGE.LIMIT.FILES_PER_UPLOAD)
    ),
    meta: jsonFrom("meta must be JSON").pipe(z.array(uploadItemSchema)),
  })
  .refine(({ file, meta }) => file.length === meta.length, {
    message: "meta needs one entry per file",
    path: ["meta"],
  });

/** Each file with its own entry, every placement's `public` resolved. */
export const toUploadItems = ({
  file,
  meta,
}: z.output<typeof uploadFormSchema>) =>
  meta.flatMap(({ alt, apps }, index) => {
    const one = file[index];
    return one
      ? [
          {
            alt,
            apps: apps.map((link) => ({
              app: link.app,
              public: link.public ?? false,
            })),
            file: one,
          },
        ]
      : [];
  });
export type UploadItem = ReturnType<typeof toUploadItems>[number];

export const patchBodySchema = z
  .array(
    z
      .object({
        alt: imageAltBodySchema.optional(),
        apps: linksSchema.optional(),
        id: z.string().min(1),
      })
      .meta({ ref: "ImageChange" })
  )
  .min(1)
  .max(IMAGE.LIMIT.BATCH)
  // Each change is checked and resolved against the Image as read: a second
  // change to the same Image would read placements the first one replaced.
  .refine(
    (changes) => new Set(changes.map(({ id }) => id)).size === changes.length,
    "names an Image more than once"
  );
export type PatchChange = z.output<typeof patchBodySchema>[number];

export const deleteBodySchema = z
  .object({
    /** Takes the Images out of this App only; left out, deletes them everywhere. */
    app: appBodySchema.optional(),
    ids: z.array(z.string().min(1)).min(1).max(IMAGE.LIMIT.BATCH),
  })
  .meta({ ref: "ImageDelete" });
