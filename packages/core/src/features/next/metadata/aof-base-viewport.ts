import type { Viewport } from "next";
import { objectValues } from "../../../shared/utils/object";
import { type ColorScheme, METADATA } from "../../metadata/constants/metadata";

type Options = {
  /** The App's ground in each scheme (its Design's image colours). */
  schemeColors: Record<ColorScheme, { background: string }>;
};

/**
 * Every App's viewport, the same way: both colour schemes, so form controls
 * and an installed App's chrome follow the OS theme; a theme colour per
 * scheme from the App's ground (Safari 26+ tints its tabs from the page's
 * background instead, which the Design sets); and the page drawn edge to
 * edge (`viewport-fit=cover`), the only way iOS reports the safe-area insets
 * (all 0 otherwise). ui's base.css turns those into the page's edges
 * (`--gutter-*`, the larger of the gutter and the inset), which every
 * AOFPage, toast and fixed control keeps to; the body itself is never padded.
 */
export const AOFBaseViewport = ({ schemeColors }: Options) =>
  ({
    colorScheme: METADATA.PAGE_COLOR_SCHEME,
    themeColor: objectValues(METADATA.COLOR_SCHEME).map((scheme) => ({
      color: schemeColors[scheme].background,
      media: `(prefers-color-scheme: ${scheme})`,
    })),
    viewportFit: "cover",
  }) satisfies Viewport;
