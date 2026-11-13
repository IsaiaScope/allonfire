import {
  contentLanguageSchema,
  I18N,
} from "@allonfire/core/features/i18n/constants/locales";
import {
  objectFromEntries,
  objectKeys,
} from "@allonfire/core/shared/utils/object";
import { App, ImageAccess } from "@allonfire/database/enums";
import { MAX_ALT_LENGTH } from "@allonfire/database/features/image/utils/alt";
import { z } from "zod";

/** The messages the Image form's fields show, translated by the form. */
export type ImageFieldMessages = {
  altTooLong: string;
  appsRequired: string;
  fileTooLarge: string;
  tooManyFiles: string;
  totalTooLarge: string;
};

/** Public or private: the Image's own, never per App. */
export const imageAccessSchema = z.enum(ImageAccess);

/** An App the Image is in; the Apps are the enum's values. */
export const imageAppSchema = z.enum(App);

/**
 * An Image's alt: every Base language (an empty text marks a decorative
 * Image), plus any other language of core's catalogue, each at most
 * `MAX_ALT_LENGTH` characters. A language outside the catalogue is refused.
 * @internal
 */
export const altSchema = (
  messages?: Pick<ImageFieldMessages, "altTooLong">
) => {
  const text = z.string().max(MAX_ALT_LENGTH, messages?.altTooLong);
  return z
    .object(
      objectFromEntries(
        I18N.BASE_LANGUAGES.map((language) => [language, text] as const)
      )
    )
    .catchall(text)
    .refine((alt) =>
      objectKeys(alt).every(
        (key) => contentLanguageSchema.safeParse(key).success
      )
    );
};
export type ImageAltValues = z.output<ReturnType<typeof altSchema>>;

/** The fields every picture's row, and the Edit form, hold. */
export const imageFields = (
  messages?: Pick<ImageFieldMessages, "altTooLong" | "appsRequired">
) => ({
  access: imageAccessSchema,
  alt: altSchema(messages),
  apps: z
    .array(imageAppSchema)
    .min(1, messages?.appsRequired)
    .refine((apps) => new Set(apps).size === apps.length),
  /** The alt's "add a language" picker: the form's own, the action ignores it. */
  picker: z.string().optional(),
});
