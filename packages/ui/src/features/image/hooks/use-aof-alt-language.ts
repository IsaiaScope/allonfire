"use client";

import {
  hostLanguageSchema,
  I18N,
} from "@allonfire/core/features/i18n/constants/locales";
import { useLocale } from "next-intl";

/**
 * The content language the page speaks: an Image's alt shows in it
 * (`aofAltFor`). A locale the Host speaks that is no content language falls
 * back to the default.
 */
export const useAOFAltLanguage = () => {
  const parsed = hostLanguageSchema.safeParse(useLocale());
  return parsed.success ? parsed.data : I18N.DEFAULT_LANGUAGE;
};
