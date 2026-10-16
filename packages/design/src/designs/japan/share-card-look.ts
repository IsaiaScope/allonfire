import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { JAPAN_IMAGE_COLOR } from "./image-colors";
import { JAPAN_IMAGE_FONT } from "./image-font";

/** The tactile paving strip, in pixels of the card's 1200x630. */
const TACTILE = {
  /** The raised dots' radius and the grid they sit on. */
  DOT: 5,
  GRID: 20,
  HEIGHT: 40,
  WIDTH: 1200,
} as const;

// The tactile paving's raised dots. Satori draws one gradient, never a tiled
// one, so the dots are an SVG pattern across the strip.
const TACTILE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${TACTILE.WIDTH}" height="${TACTILE.HEIGHT}"><defs><pattern id="d" width="${TACTILE.GRID}" height="${TACTILE.GRID}" patternUnits="userSpaceOnUse"><circle cx="${TACTILE.GRID / 2}" cy="${TACTILE.GRID / 2}" r="${TACTILE.DOT}" fill="black" fill-opacity="0.22"/></pattern></defs><rect width="100%" height="100%" fill="${JAPAN_IMAGE_COLOR.TACTILE}"/><rect width="100%" height="100%" fill="url(#d)"/></svg>`;

const EDGE = { height: TACTILE.HEIGHT, image: svgDataUrl(TACTILE_SVG) };

const look = (scheme: "dark" | "light") => {
  const { background, foreground, mutedForeground } = JAPAN_IMAGE_COLOR[scheme];
  return {
    colors: { background, foreground, mutedForeground },
    edge: EDGE,
    fontFamily: JAPAN_IMAGE_FONT.FAMILY,
  };
};

/**
 * How the Japan Design dresses `AOFShareCard` (`@allonfire/ui`), per colour
 * scheme: its colours and image face, and the yellow tactile paving along the
 * bottom edge, like a platform's.
 */
export const JAPAN_SHARE_CARD = {
  dark: look("dark"),
  light: look("light"),
} as const;
