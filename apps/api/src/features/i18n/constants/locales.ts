import { objectValues } from "@allonfire/utils/object";
import { z } from "zod";
import EN from "../translations/en.json" with { type: "json" };
import IT from "../translations/it.json" with { type: "json" };

/**
 * Locales this API renders messages in, as full BCP 47 tags. A bare language is
 * never a locale here — `Accept-Language: it` resolves to a regional variant
 * before anything is rendered.
 *
 * Which variant a bare tag lands on is decided by CLDR likely-subtags inside
 * `@formatjs/intl-localematcher`, not by the order of this object: `it`
 * maximizes to `it-Latn-IT`, so it picks `it-IT`.
 */
export const LOCALE = {
  EN_US: "en-US",
  EN_GB: "en-GB",
  IT_IT: "it-IT",
  IT_CH: "it-CH",
} as const;

export const localeSchema = z.enum(LOCALE);
export type Locale = z.infer<typeof localeSchema>;

/** `match()` needs a mutable array of candidates, in no particular order. */
export const SUPPORTED_LOCALES: Locale[] = objectValues(LOCALE);

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
