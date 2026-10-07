import { z } from "zod";
import type { ElementOf } from "../../../shared/utils/object";

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

/**
 * The base languages: every Host speaks them, so shared text and stored
 * content always carry them. The first one is the default.
 */
export const BASE_LANGUAGES = ["en", "it"] as const;
export type Language = ElementOf<typeof BASE_LANGUAGES>;

/** Where a missing or unknown language lands, and what content falls back to. */
export const [DEFAULT_LANGUAGE] = BASE_LANGUAGES;

/** Narrows next-intl's `useLocale()` (a plain string) to a base `Language`. */
export const languageSchema = z.enum(BASE_LANGUAGES);

/**
 * Languages a Host speaks beyond the base ones. Add one here before any Host
 * routes it: stored content (an Image's alt) then accepts it without a
 * migration, and every Host that reads it falls back to `DEFAULT_LANGUAGE`.
 */
export const EXTRA_LANGUAGES = [] as const;

/** Every language any Host speaks. */
export const CONTENT_LANGUAGES = [
  ...BASE_LANGUAGES,
  ...EXTRA_LANGUAGES,
] as const;
export type ContentLanguage = ElementOf<typeof CONTENT_LANGUAGES>;
export const contentLanguageSchema = z.enum(CONTENT_LANGUAGES);

/** A Host's languages: every base language first, then content languages. */
export type HostLanguages = readonly [
  ...typeof BASE_LANGUAGES,
  ...ContentLanguage[],
];

/**
 * A Host's languages: every base language, then any content languages it
 * adds, `defineLanguages([...BASE_LANGUAGES, "fr"])`. Dropping a base
 * language, or adding one not in `CONTENT_LANGUAGES`, fails to compile.
 */
export const defineLanguages = <const L extends readonly ContentLanguage[]>(
  languages: readonly [...typeof BASE_LANGUAGES, ...L]
) => languages;
