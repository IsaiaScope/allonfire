import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOFManifestIcons } from "@allonfire/core/features/next/metadata/aof-icon-images";
import { JAPAN_IMAGE_COLOR } from "@allonfire/design/designs/japan/image-colors";
import type { MetadataRoute } from "next";
import { metadataText } from "@/features/metadata/utils/metadata-text";
import { BACK_OFFICE } from "@/shared/constants/back-office";

const LIGHT = JAPAN_IMAGE_COLOR[METADATA.COLOR_SCHEME.LIGHT];

// Only discovered at the app root, so it is not localized: the default
// language. `display: "browser"`: Android adds a shortcut that opens a tab;
// iOS 26+ opens its own window by default anyway. Members Chrome uses only
// for installable apps (screenshots, shortcuts, display_override) would do
// nothing here.
const manifest = (): MetadataRoute.Manifest => ({
  background_color: LIGHT.background,
  description: metadataText(I18N.DEFAULT_LANGUAGE)("description"),
  dir: "ltr",
  display: "browser",
  icons: AOFManifestIcons(),
  id: METADATA.PATH.ROOT,
  lang: I18N.DEFAULT_LANGUAGE,
  name: BACK_OFFICE.NAME,
  scope: METADATA.PATH.ROOT,
  short_name: BACK_OFFICE.NAME,
  start_url: METADATA.PATH.ROOT,
  theme_color: LIGHT.background,
});

export default manifest;
