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
    const source =
      shown &&
      document.querySelector<HTMLMetaElement>(
        `meta[name="${METADATA.THEME_COLOR.NAME}"][media="${colorSchemeMedia(shown)}"]`
      );
    if (!source) {
      return;
    }
    const tag = document.createElement("meta");
    tag.name = METADATA.THEME_COLOR.NAME;
    tag.content = source.content;
    document.head.prepend(tag);
    return () => tag.remove();
  }, [scheme]);

  return null;
};
