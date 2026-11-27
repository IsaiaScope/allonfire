"use client";

import {
  colorSchemeSchema,
  METADATA,
} from "@allonfire/core/features/metadata/constants/metadata";
import { colorSchemeMedia } from "@allonfire/core/features/metadata/utils/color-scheme-media";
import { useEffect } from "react";
import { useAOFColorScheme } from "../../../shared/hooks/use-aof-theme-switch";

/**
 * Colours the browser's bars (an installed App's status bar) for the theme on
 * screen. The viewport's two theme colour tags follow the device's theme, so
 * an App switched to the other one kept the device's colour. This adds a tag
 * with no media, holding the colour of the theme on screen: a browser takes
 * the first tag that applies, so it goes first. Next's own tags stay as they
 * are, and a page without them gets none.
 */
export const AOFThemeColor = () => {
  const { scheme } = useAOFColorScheme();

  useEffect(() => {
    const shown = colorSchemeSchema.safeParse(scheme).data;
    if (!shown) {
      return;
    }
    const viewportTags = `meta[name="${METADATA.THEME_COLOR.NAME}"]`;
    const ofShown = `[media="${colorSchemeMedia(shown)}"]`;
    const source = document.querySelector<HTMLMetaElement>(
      `${viewportTags}${ofShown}`
    );
    const other = document.querySelector<HTMLMetaElement>(
      `${viewportTags}[media]:not(${ofShown})`
    );
    if (!(source && other)) {
      return;
    }
    const tag = document.createElement("meta");
    tag.name = METADATA.THEME_COLOR.NAME;
    tag.content = source.content;
    document.head.prepend(tag);
    // When the device switches theme, an installed Android App rebuilds its
    // screen in the manifest's colour, and Chrome repaints it only when the
    // page's colour changes. Ours does not, so it takes the other theme's and
    // goes straight back. Writing the same colour again is not enough.
    const repaint = () => {
      tag.content = other.content;
      tag.content = source.content;
    };
    const device = window.matchMedia(
      colorSchemeMedia(METADATA.COLOR_SCHEME.DARK)
    );
    device.addEventListener("change", repaint);
    return () => {
      device.removeEventListener("change", repaint);
      tag.remove();
    };
  }, [scheme]);

  return null;
};
