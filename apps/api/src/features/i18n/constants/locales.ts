import { z } from "zod";
import EN from "../translations/en.json" with { type: "json" };
import IT from "../translations/it.json" with { type: "json" };

/**
 * Locales this API renders messages in, as full BCP 47 tags. A bare language is
 * never a locale here — `Accept-Language: it` resolves to a regional variant
 * before anything is rendered.
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

/** Where an absent, malformed or unsupported `Accept-Language` lands. */
export const DEFAULT_LOCALE: Locale = LOCALE.EN_US;

/** Every message the API renders. Errors are just the keys that exist today. */
export type TranslationKey = keyof typeof EN;

/** Derived from the source language, so no key list or value type is retyped. */
export type Translations = typeof EN;

/**
 * Locale to its messages. Variants share their language's object by reference —
 * a spread would allocate a second copy of every string per variant, and it is
 * the catalogue that grows, not the variant count.
 *
 * `satisfies` is the completeness check: add a locale above without a file here
 * and this fails. Keys are computed from `LOCALE` so no tag is typed twice.
 */
export const CATALOGUE = {
  [LOCALE.EN_US]: EN,
  [LOCALE.EN_GB]: EN,
  [LOCALE.IT_IT]: IT,
  [LOCALE.IT_CH]: IT,
} as const satisfies Record<Locale, Translations>;
