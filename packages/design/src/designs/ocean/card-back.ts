import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { OCEAN_IMAGE_COLOR } from "./image-colors";
import { OCEAN_MARK, oceanMarkMarkup } from "./ocean-mark";
import { oceanWavePath } from "./sea-wave";

const WIDTH = 300;
const HEIGHT = 400;
const CORNER = 24;
const EDGE_WIDTH = 3;
const MARK = 128;
/** The octopus's own square, scaled to `MARK`. */
const MARK_SCALE = MARK / OCEAN_MARK.EDGE;
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
 * rows of waves and the octopus in the dark coral. 3:1 on the edge keeps it
 * visible on the dark ground, where the ink alone is 1.11:1. 3:4, so a board
 * lays it in a grid.
 */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" fill="none">
<rect x="${EDGE_WIDTH / 2}" y="${EDGE_WIDTH / 2}" width="${WIDTH - EDGE_WIDTH}" height="${HEIGHT - EDGE_WIDTH}" rx="${CORNER - EDGE_WIDTH / 2}" fill="${INK}" stroke="${dark.primary}" stroke-width="${EDGE_WIDTH}"/>
${wave(84)}
${wave(HEIGHT - 84)}
<g transform="translate(${(WIDTH - MARK) / 2} ${(HEIGHT - MARK) / 2}) scale(${MARK_SCALE})">
${oceanMarkMarkup({ body: dark.coral, ink: INK })}
</g>
</svg>`;

export const OCEAN_CARD_BACK = {
  DATA_URL: svgDataUrl(SVG),
  HEIGHT,
  SVG,
  WIDTH,
} as const;
