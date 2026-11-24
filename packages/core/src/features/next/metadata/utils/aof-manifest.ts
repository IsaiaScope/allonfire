import type { MetadataRoute } from "next";
import { I18N } from "../../../i18n/constants/locales";
import { METADATA } from "../../../metadata/constants/metadata";
import { AOFManifestIcons } from "../components/aof-icon-images";

/**
 * An App's web manifest. Only discovered at the app root, so it is not
 * localized: the default language. `display: "standalone"` (ADR 0025):
 * installed, the App opens in its own window, and Chrome, Edge and Android
 * offer their install dialog, which the Install hint's button opens.
 */
export const aofManifest = ({
  description,
  ground,
  name,
}: {
  description: string;
  /** The background and theme colour: the Design's ground. */
  ground: string;
  name: string;
}): MetadataRoute.Manifest => ({
  background_color: ground,
  description,
  dir: "ltr",
  display: "standalone",
  icons: AOFManifestIcons(),
  id: METADATA.PATH.ROOT,
  lang: I18N.DEFAULT_LANGUAGE,
  name,
  scope: METADATA.PATH.ROOT,
  short_name: name,
  start_url: METADATA.PATH.ROOT,
  theme_color: ground,
});
