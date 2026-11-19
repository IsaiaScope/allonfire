import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { OCEAN_IMAGE_COLOR } from "./image-colors";
import { OCEAN_ART } from "./mascot-art";
import { oceanWavePath } from "./sea-wave";

const WIDTH = 300;
const HEIGHT = 400;
const CORNER = 24;
const EDGE_WIDTH = 3;
const MARK = 128;
/** The Noto octopus is drawn in its own square: a nested SVG places and scales it. */
const MARK_TAG = `<svg x="${(WIDTH - MARK) / 2}" y="${(HEIGHT - MARK) / 2}" width="${MARK}" height="${MARK}" `;
const WAVE_OPACITY = 0.35;

const { dark, INK } = OCEAN_IMAGE_COLOR;

const WAVE_RISE = 18;

const WAVE_PERIOD = 120;
const WAVE_WIDTH = 240;
/** Centres the row's width on the card. */
const WAVE_INSET = (WIDTH - WAVE_WIDTH) / 2;

/** A row of waves at height `y`. */
const wave = (y: number) =>
  `<path transform="translate(${WAVE_INSET} 0)" d="${oceanWavePath({ amplitude: WAVE_RISE, period: WAVE_PERIOD, width: WAVE_WIDTH, y })}" fill="none" stroke="${dark.primary}" stroke-opacity="${WAVE_OPACITY}" stroke-width="3" stroke-linecap="round"/>`;

/**
 * The back of a Memory game card, the same for both schemes (the ink is
 * furniture, like Japan's): the ink with an edge in the dark primary, two
 * rows of waves and the Noto octopus in its own full colour (a picture, so it
 * needs no contrast of its own: it reads on the ink). 3:1 on the edge keeps
 * the card visible on the dark ground, where the ink alone is 1.11:1. 3:4, so
 * a board lays it in a grid.
 */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
<rect x="${EDGE_WIDTH / 2}" y="${EDGE_WIDTH / 2}" width="${WIDTH - EDGE_WIDTH}" height="${HEIGHT - EDGE_WIDTH}" rx="${CORNER - EDGE_WIDTH / 2}" fill="${INK}" stroke="${dark.primary}" stroke-width="${EDGE_WIDTH}"/>
${wave(84)}
${wave(HEIGHT - 84)}
${OCEAN_ART.OCTOPUS_NOTO.SVG.replace("<svg ", MARK_TAG)}
</svg>`;

export const OCEAN_CARD_BACK = {
  DATA_URL: svgDataUrl(SVG),
  HEIGHT,
  SVG,
  WIDTH,
} as const;
