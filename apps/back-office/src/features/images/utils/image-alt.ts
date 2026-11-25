import { I18N } from "@allonfire/core/features/i18n/constants/locales";

/**
 * The alt to show in `language`: its text there, else the default language's.
 * One rule for the list, the cards and the selection labels.
 */
export const altFor = (
  alt: { en: string } & Partial<Record<string, string | undefined>>,
  language: string
): string => alt[language] || alt[I18N.DEFAULT_LANGUAGE] || "";
