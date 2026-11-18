import type { ColorScheme } from "@allonfire/core/features/metadata/constants/metadata";
import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { OCEAN_IMAGE_COLOR } from "./image-colors";
import { OCEAN_IMAGE_FONT } from "./image-font";
import { oceanWavePath } from "./sea-wave";

/** The sea line along the card's foot, in pixels of the card's 1200x630. */
const SEA = {
  /** How far a crest rises above the waterline. */
  AMPLITUDE: 14,
  HEIGHT: 48,
  /** One wave, crest to crest. */
  PERIOD: 120,
  WIDTH: 1200,
} as const;

const WATERLINE = SEA.HEIGHT / 2;

// The sea line closed down to the edge, filled. Satori draws one gradient,
// never a pattern, so the edge is an SVG image.
const wavePath = () =>
  `${oceanWavePath({ amplitude: SEA.AMPLITUDE, period: SEA.PERIOD, width: SEA.WIDTH, y: WATERLINE })}V${SEA.HEIGHT}H0Z`;

const edge = (scheme: ColorScheme) => {
  const { background, primary } = OCEAN_IMAGE_COLOR[scheme];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SEA.WIDTH}" height="${SEA.HEIGHT}"><rect width="100%" height="100%" fill="${background}"/><path d="${wavePath()}" fill="${primary}"/></svg>`;
  return { height: SEA.HEIGHT, image: svgDataUrl(svg) };
};

const look = (scheme: ColorScheme) => {
  const { background, foreground, mutedForeground } = OCEAN_IMAGE_COLOR[scheme];
  return {
    colors: { background, foreground, mutedForeground },
    edge: edge(scheme),
    fontFamily: OCEAN_IMAGE_FONT.FAMILY,
  };
};

/**
 * How the Ocean Design dresses `AOFShareCard` (`@allonfire/ui`), per colour
 * scheme: its colours and image face, and a wave in the primary along the
 * bottom edge, so the card's foot reads as the sea line. The card's band is
 * `OCEAN_IMAGE_COLOR[scheme].coral`, which the App passes.
 */
export const OCEAN_SHARE_CARD = {
  dark: look("dark"),
  light: look("light"),
} as const;
