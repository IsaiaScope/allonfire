import {
  LOCALE,
  type Locale,
} from "@allonfire/core/features/i18n/constants/locales";
import EN from "../translations/en.json" with { type: "json" };
import IT from "../translations/it.json" with { type: "json" };

// LOCALE, Locale and SUPPORTED_LOCALES live in @allonfire/core (ADR 0012):
// the Apps read the same list. The default and the messages are the API's.

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
 * `satisfies` is the completeness check: add a locale without a file here and
 * this fails. Keys are computed from `LOCALE` so no tag is typed twice.
 */
export const CATALOGUE = {
  [LOCALE.EN_US]: EN,
  [LOCALE.EN_GB]: EN,
  [LOCALE.IT_IT]: IT,
  [LOCALE.IT_CH]: IT,
} as const satisfies Record<Locale, Translations>;
