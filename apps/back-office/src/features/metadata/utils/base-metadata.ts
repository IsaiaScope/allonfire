import { languageSchema } from "@allonfire/core/features/i18n/constants/locales";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOFBaseMetadata } from "@allonfire/core/features/next/metadata/aof-base-metadata";
import { AOFLaunchScreenLinks } from "@allonfire/core/features/next/metadata/launch-screens";
import { App } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import { cache } from "react";
import { routing } from "@/features/i18n/routing";
import { BACK_OFFICE } from "@/shared/constants/back-office";

// The same for every language and request.
const STARTUP_IMAGE = AOFLaunchScreenLinks();

/**
 * What the Back Office's head says on every page, in the request's language.
 * Cached per request: the layout and the page's `pageOpenGraph` both read it.
 */
export const baseMetadata = cache((locale: string) =>
  AOFBaseMetadata({
    appName: BACK_OFFICE.NAME,
    indexing: ACCESS.APP_SETTINGS[App.BACK_OFFICE].indexing,
    locale: languageSchema.parse(locale),
    locales: routing.locales,
    shareImage: {
      ...METADATA.SHARE_IMAGE.SIZE,
      alt: BACK_OFFICE.SHARE_IMAGE_ALT,
    },
    startupImage: STARTUP_IMAGE,
  })
);
