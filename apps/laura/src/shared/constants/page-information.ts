import { aofAppMetadata } from "@allonfire/core/features/next/metadata/utils/aof-app-metadata";
import { AOFLaunchScreenLinks } from "@allonfire/core/features/next/metadata/utils/launch-screens";
import { App } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import { OCEAN_IMAGE_COLOR } from "@allonfire/design/designs/ocean/image-colors";
import { OCEAN_SHARE_CARD } from "@allonfire/design/designs/ocean/share-card-look";
import { aofAppImages } from "@allonfire/ui/features/image/utils/aof-app-images";
import { getPathname } from "@/features/i18n/navigation";
import { routing } from "@/features/i18n/routing";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { imageFonts } from "@/features/metadata/utils/image-fonts";
import { LAURA } from "./laura";

/**
 * Everything Laura's head and generated images say, bound once to its own
 * values: the shared factories read them, so each page, layout and image file
 * imports from here and never re-derives them.
 */
export const { layoutMetadata, metadataText, pageMetadata } = aofAppMetadata({
  getPathname,
  indexing: ACCESS.APP_SETTINGS[App.LAURA].indexing,
  name: LAURA.name,
  routing,
  shareImageAlt: LAURA.shareImageAlt,
  // The same for every language and request.
  startupImage: AOFLaunchScreenLinks(),
  translations: { en: EN, it: IT },
});

export const { iconImage, launchScreen, shareImage } = aofAppImages({
  band: LAURA.line,
  fonts: imageFonts,
  imageColor: OCEAN_IMAGE_COLOR,
  logo: LAURA.logo,
  metadataText,
  shareCard: OCEAN_SHARE_CARD,
});
