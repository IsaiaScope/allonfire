import type { ValueOf } from "@allonfire/core/shared/utils/object";

/** The moments the octopus has a face for. */
export const OCEAN_FACE = {
  DIZZY: "dizzy",
  HAPPY: "happy",
  LOST: "lost",
  SLEEPY: "sleepy",
  SURPRISED: "surprised",
  WINK: "wink",
} as const;

export type OceanFace = ValueOf<typeof OCEAN_FACE>;

/** What the octopus is drawn in: its body, the ink of its face, and which face. */
type OceanMarkColors = { body: string; face?: OceanFace; ink: string };

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
 * favicon holds it. It wears one face per moment (`OCEAN_FACE`): dizzy is the
 * Memory game card back's and an error's; a new face is a new function
 * beside `dizzyFace`, and a new entry of `FACES`.
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

const EYE_DOT = 5;

/** A round dot, an eye: `dx` and `dy` look to a side. */
const dot = (x: number, ink: string) =>
  `<circle cx="${x}" cy="${EYES.Y}" r="${EYE_DOT}" fill="${ink}"/>`;

const SMILE = "M88 128q12 12 24 0";

/** Round eyes and a smile. */
const happyFace = (ink: string) =>
  dot(EYES.LEFT, ink) + dot(EYES.RIGHT, ink) + faceStroke(SMILE, ink);

/** One eye shut, a smile: a nod. */
const winkFace = (ink: string) =>
  dot(EYES.LEFT, ink) +
  faceStroke(`M${EYES.RIGHT - 8} ${EYES.Y}q8-8 16 0`, ink) +
  faceStroke(SMILE, ink);

/** Eyes that look aside and a small wavering mouth: where is it? */
const lostFace = (ink: string) =>
  dot(EYES.LEFT - 6, ink) +
  dot(EYES.RIGHT - 6, ink) +
  faceStroke("M90 132q5-5 10 0t10 0", ink);

/** Shut eyes drooping down, a tiny mouth: asleep. */
const sleepyFace = (ink: string) =>
  [EYES.LEFT, EYES.RIGHT]
    .map((x) => faceStroke(`M${x - 8} ${EYES.Y}q8 8 16 0`, ink))
    .join("") + faceStroke("M96 132q4 5 8 0", ink);

/** Wide eyes and a small round mouth. */
const surprisedFace = (ink: string) => {
  const eye = (x: number) =>
    `<circle cx="${x}" cy="${EYES.Y}" r="${EYE_DOT + 3}" fill="none" stroke="${ink}" stroke-width="5"/>`;
  return `${eye(EYES.LEFT)}${eye(EYES.RIGHT)}<ellipse cx="100" cy="134" rx="6" ry="8" fill="${ink}"/>`;
};

const FACES = {
  [OCEAN_FACE.DIZZY]: dizzyFace,
  [OCEAN_FACE.HAPPY]: happyFace,
  [OCEAN_FACE.LOST]: lostFace,
  [OCEAN_FACE.SLEEPY]: sleepyFace,
  [OCEAN_FACE.SURPRISED]: surprisedFace,
  [OCEAN_FACE.WINK]: winkFace,
} as const satisfies Record<OceanFace, (ink: string) => string>;

/** The octopus's markup, to place inside any SVG whose units are `OCEAN_MARK.EDGE`. */
export const oceanMarkMarkup = ({
  body,
  face = OCEAN_FACE.DIZZY,
  ink,
}: OceanMarkColors) =>
  `<ellipse cx="${BLOB.CX}" cy="${BLOB.CY}" rx="${BLOB.RX}" ry="${BLOB.RY}" fill="${body}"/>${FEET_X.map((x) => `<ellipse cx="${x}" cy="${FEET.Y}" rx="${FEET.RX}" ry="${FEET.RY}" fill="${body}"/>`).join("")}${FACES[face](ink)}`;

/** The octopus alone, as an SVG document. */
export const oceanMarkSvg = (colors: OceanMarkColors) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${OCEAN_MARK.VIEW_BOX}" fill="none">${oceanMarkMarkup(colors)}</svg>`;
