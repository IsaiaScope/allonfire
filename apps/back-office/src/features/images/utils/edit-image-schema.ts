import { z } from "zod";
import { IMAGES } from "../constants/images";
import { type ImageFieldMessages, imageFields } from "./image-form-schema";

/** Why the Edit Image action refused. */
const editImageErrorSchema = z.enum(IMAGES.EDIT_ERROR);
export type EditImageError = z.infer<typeof editImageErrorSchema>;

/** What the Edit Image action says once the Image is saved. */
const editImageNoticeSchema = z.enum(IMAGES.EDIT_NOTICE);
export type EditImageNotice = z.infer<typeof editImageNoticeSchema>;

/**
 * The Edit Image form's checks (ADR 0017): the alt in every Base language
 * (and any other the Image holds), the access and the Apps. The action's run
 * is the one that counts.
 */
export const editImageSchema = (
  messages?: Pick<ImageFieldMessages, "altTooLong" | "appsRequired">
) => z.object(imageFields(messages));

export type EditImageValues = z.input<ReturnType<typeof editImageSchema>>;
