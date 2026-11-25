import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import {
  objectEntries,
  objectFromEntries,
} from "@allonfire/core/shared/utils/object";
import type { ImageAltValues } from "./image-form-schema";

/** Whether `language` is a Base language: every Image holds an alt in it. */
export const isBaseLanguage = (language: string) =>
  I18N.BASE_LANGUAGES.some((base) => base === language);

/**
 * `alt` with `language` added empty after the last one (the form lists them
 * in this order, the picker under them), or as it is when it already holds it.
 */
export const addAltLanguage = (
  alt: ImageAltValues,
  language: string
): ImageAltValues => ({ ...alt, [language]: alt[language] ?? "" });

/** `alt` without `language`; a Base language stays, every Image needs it. */
export const removeAltLanguage = (
  alt: ImageAltValues,
  language: string
): ImageAltValues => {
  if (isBaseLanguage(language)) {
    return alt;
  }
  const { [language]: _removed, ...kept } = alt;
  // A key set again keeps its place: English and Italian stay first.
  return { ...kept, en: alt.en, it: alt.it };
};

/**
 * An Image's alt as the form holds it: both Base languages first, then every
 * other language the Image has text in (a language it holds as nothing is
 * left out).
 */
export const altValuesOf = (
  alt: { en: string; it: string } & Partial<Record<string, string | undefined>>
): ImageAltValues => {
  const { en, it, ...others } = alt;
  return {
    en,
    it,
    ...objectFromEntries(
      objectEntries(others).flatMap(([language, text]) =>
        text === undefined ? [] : [[language, text] as const]
      )
    ),
  };
};
