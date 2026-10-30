/** The letters' colour on the dark ground. */
const LETTER = "#C0C0C0";
/** The letters' drop shadow, as it reads on the dark ground. */
const SHADOW = 0.45;
/** The monogram's square edge and its own centre in it. */
const EDGE = 512;
const CENTRE = { X: 244, Y: 256 } as const;

const MONOGRAM_MARKUP = `  <defs>
    <linearGradient id="flame-grad" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#FFDD44"/>
      <stop offset="50%" stop-color="#FF8811"/>
      <stop offset="100%" stop-color="#E03C00"/>
    </linearGradient>
    <filter id="text-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow class="aof-shadow" dx="2" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="${SHADOW}"/>
    </filter>
    <filter id="flame-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#FF8811" flood-opacity="0.5"/>
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <g transform="translate(${CENTRE.X}, ${CENTRE.Y})">
    <g filter="url(#text-shadow)">
      <g transform="translate(-168, 0)">
        <path d="M0 110 L58 -120 L90 -120 L148 110 L114 110 L100 56 L48 56 L34 110 Z" fill="${LETTER}" stroke="${LETTER}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"/>
        <path d="M56 30 L74 -52 L92 30 Z" fill="${LETTER}" stroke="${LETTER}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"/>
      </g>
      <g transform="translate(6, 0)">
        <ellipse cx="0" cy="-5" rx="78" ry="115" fill="${LETTER}"/>
        <ellipse cx="0" cy="-5" rx="46" ry="78" fill="${LETTER}"/>
      </g>
      <g transform="translate(82, 0)">
        <path d="M0 110 L0 -120 L110 -120 L110 -84 L36 -84 L36 -16 L90 -16 L90 18 L36 18 L36 110 Z" fill="${LETTER}" stroke="${LETTER}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"/>
      </g>
    </g>
    <g transform="translate(4.2, -3.5)" filter="url(#flame-glow)">
      <g transform="scale(5.8)">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="url(#flame-grad)" transform="translate(-12, -12)"/>
      </g>
    </g>
  </g>`;

const MONOGRAM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${EDGE} ${EDGE}" fill="none">
${MONOGRAM_MARKUP}
</svg>`;

/**
 * The Brand (CONTEXT.md): the AOF monogram, its O lit by the flame, without
 * background or App label. An App's logo sets it on a ground beside its
 * banner (`aof-logo`). Strings, not .svg files, so an App can answer its logo
 * as an icon and embed it in generated images without a bundler loader.
 */
export const BRAND = {
  /** The monogram's centre in its square, where a logo places it. */
  CENTRE,
  /** The monogram's square edge. */
  EDGE,
  /** The dark ground every App's logo sits on. */
  GROUND: "#151515",
  /** The letters' colour on the dark ground; a light logo recolours them. */
  LETTER,
  /** The monogram's defs and shapes, to set inside a logo's own `<svg>`. */
  MONOGRAM_MARKUP,
  MONOGRAM_SVG,
  /** The brand every App belongs to, as every App writes it. */
  NAME: "AllOnFire",
  /** The letters' shadow opacity on the dark ground; a light logo softens it. */
  SHADOW,
} as const;
