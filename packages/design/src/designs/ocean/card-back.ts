import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { OCEAN_IMAGE_COLOR } from "./image-colors";
import { LI_MARK, liMarkDataUrl } from "./li-mark";
import { oceanWavePath } from "./sea-wave";

const WIDTH = 300;
const HEIGHT = 400;
/** The mark's share of the card's width. */
const MARK_SHARE = 0.72;
const MARK_WIDTH = WIDTH * MARK_SHARE;
const MARK_HEIGHT = Math.round((MARK_WIDTH * LI_MARK.HEIGHT) / LI_MARK.WIDTH);
const WAVE_OPACITY = 0.3;
const WAVE_RISE = 18;
/** Three whole waves across the card, edge to edge. */
const WAVE_PERIOD = 100;
/** How far a row of waves sits from the card's top and bottom. */
const WAVE_MARGIN = 38;

type Scheme = keyof typeof LI_MARK.PNG_BASE64;

/** A row of waves at height `y`, in the scheme's primary. */
const wave = (y: number, stroke: string) =>
  `<path d="${oceanWavePath({ amplitude: WAVE_RISE, period: WAVE_PERIOD, width: WIDTH, y })}" fill="none" stroke="${stroke}" stroke-opacity="${WAVE_OPACITY}" stroke-width="3" stroke-linecap="round"/>`;

/**
 * The back of a Memory game card in one scheme: its own ground (the light's
 * secondary, the dark's card) to the very edge, two rows of waves in its
 * primary running the card's whole width and Laura's Li logo centred, navy by
 * day and gold by night (a picture, so it needs no contrast of its own). The
 * page's card clips the corners and draws the edge. 3:4, so a board lays it in
 * a grid.
 */
const back = (scheme: Scheme) => {
  const colors = OCEAN_IMAGE_COLOR[scheme === "LIGHT" ? "light" : "dark"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
<rect width="${WIDTH}" height="${HEIGHT}" fill="${scheme === "LIGHT" ? colors.secondary : colors.card}"/>
${wave(WAVE_MARGIN, colors.primary)}
${wave(HEIGHT - WAVE_MARGIN, colors.primary)}
<image x="${(WIDTH - MARK_WIDTH) / 2}" y="${(HEIGHT - MARK_HEIGHT) / 2}" width="${MARK_WIDTH}" height="${MARK_HEIGHT}" href="${liMarkDataUrl(scheme)}"/>
</svg>`;
  return { DATA_URL: svgDataUrl(svg), SVG: svg };
};

/** The card back of each scheme: a board shows the one its scheme wears. */
export const OCEAN_CARD_BACK = {
  DARK: back("DARK"),
  HEIGHT,
  LIGHT: back("LIGHT"),
  WIDTH,
} as const;
