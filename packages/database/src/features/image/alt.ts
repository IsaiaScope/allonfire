import {
  BASE_LANGUAGES,
  CONTENT_LANGUAGES,
  EXTRA_LANGUAGES,
} from "@allonfire/core/features/i18n/constants/locales";
import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import { z } from "zod";

/** Screen readers read alt aloud; past a sentence or two it belongs in a caption. */
const MAX_ALT_LENGTH = 300;
const altTextSchema = z.string().max(MAX_ALT_LENGTH);

/**
 * Every base language is required, any other content language optional, so
 * adding a language needs no data migration. An empty string marks a
 * decorative Image. A language no Host speaks is dropped.
 */
export const imageAltSchema = z.object({
  ...objectFromEntries(
    BASE_LANGUAGES.map((language) => [language, altTextSchema] as const)
  ),
  ...objectFromEntries(
    EXTRA_LANGUAGES.map(
      (language) => [language, altTextSchema.optional()] as const
    )
  ),
});
export type ImageAlt = z.infer<typeof imageAltSchema>;

/** How alt reads back: any content language may be missing from an old row. */
const storedAltSchema = z.object(
  objectFromEntries(
    CONTENT_LANGUAGES.map(
      (language) => [language, z.string().optional()] as const
    )
  )
);

/**
 * A stored alt as `ImageAlt`. A base language missing from it reads as
 * English, else the first base language with text, else "". A stored "" stays
 * "": it marks a decorative Image.
 */
export const readAlt = (stored: unknown): ImageAlt => {
  const known = storedAltSchema.parse(stored);
  const fallback =
    BASE_LANGUAGES.map((language) => known[language]).find(Boolean) ?? "";
  return {
    ...known,
    ...objectFromEntries(
      BASE_LANGUAGES.map(
        (language) => [language, known[language] ?? fallback] as const
      )
    ),
  };
};
