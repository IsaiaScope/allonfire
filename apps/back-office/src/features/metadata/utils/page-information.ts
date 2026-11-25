import { aofAppMetadata } from "@allonfire/core/features/next/metadata/utils/aof-app-metadata";
import { AOFLaunchScreenLinks } from "@allonfire/core/features/next/metadata/utils/launch-screens";
import { App } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import { JAPAN_IMAGE_COLOR } from "@allonfire/design/designs/japan/image-colors";
import { JAPAN_SHARE_CARD } from "@allonfire/design/designs/japan/share-card-look";
import { aofAppImages } from "@allonfire/ui/features/image/utils/aof-app-images";
import { getPathname } from "@/features/i18n/navigation";
import { routing } from "@/features/i18n/routing";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { imageFonts } from "./image-fonts";

/**
 * Everything the Back Office's head and generated images say, bound once to
 * its own values: the shared factories read them, so each page, layout and
 * image file imports from here and never re-derives them.
 */
export const { layoutMetadata, metadataText, pageMetadata } = aofAppMetadata({
  getPathname,
  indexing: ACCESS.APP_SETTINGS[App.BACK_OFFICE].indexing,
  name: BACK_OFFICE.name,
  routing,
  shareImageAlt: BACK_OFFICE.shareImageAlt,
  // The same for every language and request.
  startupImage: AOFLaunchScreenLinks(),
  translations: { en: EN, it: IT },
});

export const { iconImage, launchScreen, shareImage } = aofAppImages({
  // The card's top band is the Japan blue, the logo's green is the line.
  band: JAPAN_IMAGE_COLOR.light.primary,
  fonts: imageFonts,
  imageColor: JAPAN_IMAGE_COLOR,
  logo: BACK_OFFICE.logo,
  metadataText,
  shareCard: JAPAN_SHARE_CARD,
});
