import { z } from "zod";

/**
 * Locales AllOnFire renders in, as full BCP 47 tags. A bare language is never a
 * locale here — `Accept-Language: it` resolves to a regional variant before
 * anything is rendered. Apps route by `Language`, derived below.
 *
 * Key order means nothing here (Biome sorts it); the order the matcher sees is
 * `SUPPORTED_LOCALES`.
 */
export const LOCALE = {
  EN_GB: "en-GB",
  EN_US: "en-US",
  IT_CH: "it-CH",
  IT_IT: "it-IT",
} as const;

export const localeSchema = z.enum(LOCALE);
export type Locale = z.infer<typeof localeSchema>;

/**
 * Every locale, in preference order. The order is a decision, not an accident:
 * CLDR likely-subtags settle a bare `it` (to `it-IT`), but a region CLDR does
 * not know, such as `it-XX`, ties every Italian variant and `match()` takes the
 * first one listed. So the language's main variant comes first.
 */
export const SUPPORTED_LOCALES = [
  LOCALE.EN_US,
  LOCALE.EN_GB,
  LOCALE.IT_IT,
  LOCALE.IT_CH,
] as const satisfies readonly Locale[];

/** The language half of every locale: what an App's URL carries (`/it`). */
export type Language = Locale extends `${infer L}-${string}` ? L : never;

/** Every language, main one first; `tests/locales.test-d.ts` checks it is complete. */
export const LANGUAGES = ["en", "it"] as const satisfies readonly Language[];

/** Narrows next-intl's `useLocale()` (a plain string) to a `Language`. */
export const languageSchema = z.enum(LANGUAGES);
