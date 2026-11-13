import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { z } from "zod";
import { IMAGES } from "../constants/images";
import {
  type ImageFieldMessages,
  imageAccessSchema,
  imageAppSchema,
  imageFields,
} from "./image-form-schema";

/** Why the Add Images action refused. */
const addImageErrorSchema = z.enum(IMAGES.ADD_ERROR);
export type AddImageError = z.infer<typeof addImageErrorSchema>;

/** What the Add Images action says once it saved. */
const addImageNoticeSchema = z.enum(IMAGES.ADD_NOTICE);
export type AddImageNotice = z.infer<typeof addImageNoticeSchema>;

/** One row per picked file, at most what one upload takes (`IMAGE.LIMIT`). */
const rowsSchema = (messages?: ImageFieldMessages) =>
  z
    .array(
      z.object({
        ...imageFields(messages),
        file: z
          .instanceof(File)
          .refine(
            ({ size }) => size <= IMAGE.LIMIT.FILE_BYTES,
            messages?.fileTooLarge
          ),
        /** The row's key in the form: the form's own, the action ignores it. */
        id: z.string().optional(),
      })
    )
    .min(1)
    .max(IMAGE.LIMIT.FILES_PER_UPLOAD, messages?.tooManyFiles);

/** All the files together stay within the upload's limit. */
const withinUpload = ({ rows }: { rows: readonly { file: File }[] }) =>
  rows.reduce((sum, { file }) => sum + file.size, 0) <=
  IMAGE.LIMIT.UPLOAD_BYTES;

const togetherTooLarge = (messages?: ImageFieldMessages) => ({
  error: messages?.totalTooLarge,
  path: ["rows"],
});

/**
 * The Add Images action's checks: one row per picked file, at most what one
 * upload takes (`IMAGE.LIMIT`): files, each file's size and all together. The
 * action's run is the one that counts.
 */
export const addImageSchema = (messages?: ImageFieldMessages) =>
  z
    .object({ rows: rowsSchema(messages) })
    .refine(withinUpload, togetherTooLarge(messages));

/**
 * The Add Images form's checks (ADR 0017): the action's, beside the set new
 * rows start from, which only the form holds. The form's spares a round trip.
 */
export const addImageFormSchema = (messages?: ImageFieldMessages) =>
  z
    .object({
      rows: rowsSchema(messages),
      shared: z.object({
        access: imageAccessSchema,
        apps: z.array(imageAppSchema),
      }),
    })
    .refine(withinUpload, togetherTooLarge(messages));

type AddImageValues = z.input<ReturnType<typeof addImageSchema>>;
export type AddImageRowValues = AddImageValues["rows"][number];
