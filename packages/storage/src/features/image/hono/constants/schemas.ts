import { versionSchema } from "@allonfire/core/features/version/constants/version";
import { jsonFrom } from "@allonfire/core/shared/utils/json";
import { type App, ImageAccess } from "@allonfire/database/enums";
import { z } from "zod";
import { IMAGE } from "../../constants/image";
import {
  appBodySchema,
  imageAccessBodySchema,
  imageAltBodySchema,
  imageBodySchema,
} from "../../constants/schemas";

/** One numbered page, with the totals of every Image the caller sees. */
export const imagePageBodySchema = z
  .object({
    images: z.array(imageBodySchema),
    page: z.number().int(),
    pageCount: z.number().int(),
    total: z.number().int(),
    /** Every visible Image's bytes together, not the page's. */
    totalBytes: z.number().int(),
  })
  .meta({ ref: "ImagePage" });
export type ImagePageBody = z.infer<typeof imagePageBodySchema>;

/** The Images visible in `app`, or in any App when it is left out. */
export const listQuerySchema = z.object({
  /** One App's page: the Images placed in it (the search's `app:` field is any of several). */
  app: appBodySchema.optional(),
  page: z.coerce.number().int().min(1).max(IMAGE.LIMIT.MAX_PAGE).default(1),
  perPage: z.coerce
    .number()
    .int()
    .min(1)
    .max(IMAGE.LIMIT.LIST.MAX)
    .default(IMAGE.LIMIT.LIST.DEFAULT),
  /**
   * The filters and the text in one string (ADR 0026): `access:public
   * app:laura input:sea`. Blank, too long or not a string reads as none,
   * never a 400.
   */
  search: z.string().trim().max(IMAGE.LIMIT.SEARCH_MAX).catch(""),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

/** An Image is placed in an App once: a repeat is the client's 400, not a key clash. */
const eachAppOnce = (apps: readonly App[]) =>
  new Set(apps).size === apps.length;
const EACH_APP_ONCE = "names an App more than once";

/** The Apps an Image is in: at least one, each once. */
const appsSchema = z
  .array(appBodySchema)
  .min(1)
  .refine(eachAppOnce, EACH_APP_ONCE);

/**
 * One entry per uploaded file, in the same order; private unless `access` says.
 * @internal
 */
export const uploadItemSchema = z
  .object({
    access: imageAccessBodySchema.optional(),
    alt: imageAltBodySchema,
    apps: appsSchema,
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

/** Each file with its own entry, private when its `access` is left out. */
export const toUploadItems = ({
  file,
  meta,
}: z.output<typeof uploadFormSchema>) =>
  meta.flatMap(({ access, alt, apps }, index) => {
    const one = file[index];
    return one
      ? [{ access: access ?? ImageAccess.PRIVATE, alt, apps, file: one }]
      : [];
  });
export type UploadItem = ReturnType<typeof toUploadItems>[number];

export const patchBodySchema = z
  .array(
    z
      .object({
        access: imageAccessBodySchema.optional(),
        alt: imageAltBodySchema.optional(),
        apps: appsSchema.optional(),
        id: z.string().min(1),
        /** The Version the change was made on (`Image.version`). */
        version: versionSchema,
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

/** How many Images a DELETE took out of the App or deleted: fewer than named when some were already gone. */
export const deleteResultBodySchema = z
  .object({ deleted: z.number().int().min(0) })
  .meta({ ref: "ImageDeleteResult" });
