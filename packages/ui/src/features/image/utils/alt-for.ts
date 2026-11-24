import { I18N } from "@allonfire/core/features/i18n/constants/locales";

/**
 * An Image's alt in `language`, English when it has none in it. A stored
 * `""` stays `""`: it marks a decorative Image, never a missing one.
 */
export const aofAltFor = (
  alt: { en: string } & Partial<Record<string, string | undefined>>,
  language: string
): string => alt[language] ?? alt[I18N.DEFAULT_LANGUAGE] ?? "";
