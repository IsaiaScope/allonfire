/** What the octopus is drawn in: its body, and the ink of its face. */
type OceanMarkColors = { body: string; ink: string };

const FEET_X = [56, 84, 116, 144] as const;
const FEET = { RX: 11, RY: 9, Y: 172 } as const;
const BLOB = { CX: 100, CY: 112, RX: 64, RY: 60 } as const;
/** Where the eyes sit and how far apart. */
const EYES = { LEFT: 80, RIGHT: 120, Y: 104 } as const;
const CROSS = 9;
/** The square the octopus is drawn in. */
const EDGE = 200;

/**
 * The octopus, Laura's mascot, drawn for Ocean as a kawaii blob (chosen
 * from the owner's board, S1): a round body on four tiny feet, plain
 * ellipses in two colours, no filter or gradient, so Satori draws it and a
 * favicon holds it. It wears one face for now, dizzy, the Memory game card
 * back's; a new face is a new function beside `dizzyFace`.
 */
export const OCEAN_MARK = {
  EDGE,
  VIEW_BOX: `0 0 ${EDGE} ${EDGE}`,
} as const;

const faceStroke = (d: string, ink: string) =>
  `<path d="${d}" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Crossed-out eyes and a wavering mouth. */
const dizzyFace = (ink: string) =>
  [EYES.LEFT, EYES.RIGHT]
    .map((x) =>
      faceStroke(
        `M${x - CROSS} ${EYES.Y - CROSS}l${CROSS * 2} ${CROSS * 2}M${x + CROSS} ${EYES.Y - CROSS}l${-CROSS * 2} ${CROSS * 2}`,
        ink
      )
    )
    .join("") + faceStroke("M86 134q7-8 14 0t14 0", ink);

/** The octopus's markup, to place inside any SVG whose units are `OCEAN_MARK.EDGE`. */
export const oceanMarkMarkup = ({ body, ink }: OceanMarkColors) =>
  `<ellipse cx="${BLOB.CX}" cy="${BLOB.CY}" rx="${BLOB.RX}" ry="${BLOB.RY}" fill="${body}"/>${FEET_X.map((x) => `<ellipse cx="${x}" cy="${FEET.Y}" rx="${FEET.RX}" ry="${FEET.RY}" fill="${body}"/>`).join("")}${dizzyFace(ink)}`;

/** The octopus alone, as an SVG document. */
export const oceanMarkSvg = (colors: OceanMarkColors) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${OCEAN_MARK.VIEW_BOX}" fill="none">${oceanMarkMarkup(colors)}</svg>`;
