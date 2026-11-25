import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { createTranslator } from "next-intl";

/** The shared Image upload copy in English, as a visitor reads it: a test names a control by its source, never retyped. */
export const uploadCopy = createTranslator({
  locale: "en",
  messages: SHARED_TRANSLATIONS.en,
  namespace: "Common.ImageUpload",
});

/** The shared Image field copy (alt, access, Apps) in English. */
export const fieldsCopy = createTranslator({
  locale: "en",
  messages: SHARED_TRANSLATIONS.en,
  namespace: "Common.ImageFields",
});
