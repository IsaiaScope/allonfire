import {
  I18N,
  type Language,
  languageSchema,
} from "@allonfire/core/features/i18n/constants/locales";
import { createTranslator } from "next-intl";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };

const TRANSLATIONS = { en: EN, it: IT } as const satisfies Record<
  Language,
  typeof EN
>;

// The default language for a locale the App does not route: Next collects an
// image's metadata at build with a placeholder for `[locale]`.
const localeSchema = languageSchema.catch(I18N.DEFAULT_LANGUAGE);

/**
 * The `Metadata` translations for a locale, without next-intl's request
 * config: an image file is a Route Handler, where `next/root-params` (and so
 * `getTranslations`) is not available.
 */
export const metadataText = (locale: string) => {
  const language = localeSchema.parse(locale);
  return createTranslator({
    locale: language,
    messages: TRANSLATIONS[language],
    namespace: "Metadata",
  });
};
