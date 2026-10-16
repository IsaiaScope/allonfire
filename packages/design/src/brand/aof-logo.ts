import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { BRAND } from "./aof-monogram";

/** What an App brings to its logo: its name, its banner's colours, the face the name is set in. */
export type AppLogo = {
  name: string;
  /** The banner's gradient, left to right. */
  banner: readonly [string, string, string];
  fontFamily: string;
};

/** A banner on the logo, in the units of its layout. */
type Banner = {
  LEFT: number;
  TOP: number;
  WIDTH: number;
  HEIGHT: number;
  RADIUS: number;
  FONT_SIZE: number;
  LETTER_SPACING: number;
  /** The text's baseline from the banner's top. */
  BASELINE: number;
};

export type Geometry = {
  WIDTH: number;
  HEIGHT: number;
  RADIUS: number;
  /** Where the monogram's centre sits, and its scale from the 512 square. */
  MONOGRAM: { X: number; Y: number; SCALE: number };
  BANNER: Banner;
  /** The line between monogram and banner, side by side only. */
  DIVIDER?: {
    X: number;
    Y: number;
    WIDTH: number;
    HEIGHT: number;
    OPACITY: number;
  };
};

/**
 * The logo's two layouts, as Laura's logos are drawn: square for icons (the
 * monogram lifted, the banner beneath), horizontal for a page's header (the
 * monogram, a thin divider, the banner beside it).
 */
const LAYOUT = {
  horizontal: {
    BANNER: {
      BASELINE: 69,
      FONT_SIZE: 40,
      HEIGHT: 110,
      LEFT: 272,
      LETTER_SPACING: 5,
      RADIUS: 24,
      TOP: 55,
      WIDTH: 420,
    },
    DIVIDER: { HEIGHT: 120, OPACITY: 0.25, WIDTH: 3, X: 227, Y: 50 },
    HEIGHT: 220,
    MONOGRAM: { SCALE: 0.38, X: 112, Y: 110 },
    RADIUS: 36,
    WIDTH: 740,
  },
  square: {
    BANNER: {
      BASELINE: 39,
      FONT_SIZE: 30,
      HEIGHT: 58,
      LEFT: 72,
      LETTER_SPACING: 4,
      RADIUS: 16,
      TOP: 352,
      WIDTH: 370,
    },
    HEIGHT: 512,
    MONOGRAM: { SCALE: 1, X: 244, Y: 230 },
    RADIUS: 72,
    WIDTH: 512,
  },
} as const satisfies Record<string, Geometry>;

/** The ground and letters of each scheme; the flame and banner never change. */
const SCHEME = {
  dark: { ground: BRAND.GROUND, letter: BRAND.LETTER, shadow: BRAND.SHADOW },
  // The dark scheme's shadow would read as a grey halo on white.
  light: { ground: "#ffffff", letter: "#3a3a3a", shadow: 0.12 },
} as const satisfies Record<
  string,
  { ground: string; letter: string; shadow: number }
>;

export type LogoLayout = keyof typeof LAYOUT;
export type LogoScheme = keyof typeof SCHEME;

/** Each layout's geometry and each scheme's colours, for a renderer drawing the logo itself. */
export const AOF_LOGO = { LAYOUT, SCHEME } as const;

/** The monogram in a scheme's letters and shadow. */
const monogramMarkup = ({
  letter,
  shadow,
}: {
  letter: string;
  shadow: number;
}) =>
  BRAND.MONOGRAM_MARKUP.replaceAll(BRAND.LETTER, letter).replace(
    `flood-opacity="${BRAND.SHADOW}"`,
    `flood-opacity="${shadow}"`
  );

/** The dark monogram, its letters classed so a stylesheet recolours them. */
const classedMonogramMarkup = () =>
  BRAND.MONOGRAM_MARKUP.replaceAll(
    `fill="${BRAND.LETTER}"`,
    `class="aof-letter" fill="${BRAND.LETTER}"`
  );

/** The monogram alone in a scheme, as a data URL an image renderer loads. */
export const monogramDataUrl = (scheme: LogoScheme) =>
  svgDataUrl(
    BRAND.MONOGRAM_SVG.replace(
      BRAND.MONOGRAM_MARKUP,
      monogramMarkup(SCHEME[scheme])
    )
  );

/**
 * An App's logo as a data URL, for a page that shows it inside its HTML:
 * painted with the page, no request of its own. URL-encoded rather than
 * base64 (`svgDataUrl`): shorter for SVG text, and it needs no Node `Buffer`,
 * so a client component (an error boundary) can build it too.
 */
export const aofLogoDataUrl = (options: LogoSvgOptions) =>
  `data:image/svg+xml,${encodeURIComponent(aofLogoSvg(options))}`;

/** Where the monogram's 512 square lands for a centre and scale. */
export const monogramBox = ({ SCALE, X, Y }: Geometry["MONOGRAM"]) => ({
  left: X - BRAND.CENTRE.X * SCALE,
  size: BRAND.EDGE * SCALE,
  top: Y - BRAND.CENTRE.Y * SCALE,
});

/** Swaps the dark logo for the light one when the viewer's theme is light. */
const LIGHT_STYLE = `<style>@media (prefers-color-scheme: light){.aof-ground{fill:${SCHEME.light.ground}}.aof-letter{fill:${SCHEME.light.letter}}.aof-letter[stroke]{stroke:${SCHEME.light.letter}}.aof-divider{fill:${SCHEME.light.letter}}.aof-shadow{flood-opacity:${SCHEME.light.shadow}}}</style>`;

type LogoSvgOptions = {
  app: AppLogo;
  layout: LogoLayout;
  /** `auto` follows the viewer's theme (a favicon, an `<img>` on a page). */
  scheme: LogoScheme | "auto";
};

/**
 * An App's logo as SVG: the Brand monogram on its ground and the App's name
 * on a banner in its colours. The text is set in `app.fontFamily` where the
 * viewer has it, a sans-serif otherwise; generated images draw the same logo
 * with ui's `AOFBrandLogo`, in the face they load.
 */
export const aofLogoSvg = ({ app, layout, scheme }: LogoSvgOptions) => {
  const auto = scheme === "auto";
  const colors = SCHEME[auto ? "dark" : scheme];
  const { ground, letter } = colors;
  const geometry: Geometry = LAYOUT[layout];
  const { BANNER, DIVIDER, HEIGHT, RADIUS, WIDTH } = geometry;
  const box = monogramBox(geometry.MONOGRAM);
  const [from, middle, to] = app.banner;
  const divider = DIVIDER
    ? `<rect class="aof-divider" x="${DIVIDER.X}" y="${DIVIDER.Y}" width="${DIVIDER.WIDTH}" height="${DIVIDER.HEIGHT}" rx="${DIVIDER.WIDTH / 2}" fill="${letter}" opacity="${DIVIDER.OPACITY}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" fill="none">${auto ? LIGHT_STYLE : ""}
  <defs>
    <linearGradient id="banner-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="50%" stop-color="${middle}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect class="aof-ground" width="${WIDTH}" height="${HEIGHT}" rx="${RADIUS}" fill="${ground}"/>
  <g transform="translate(${box.left}, ${box.top}) scale(${geometry.MONOGRAM.SCALE})">
${auto ? classedMonogramMarkup() : monogramMarkup(colors)}
  </g>
  ${divider}
  <g transform="translate(${BANNER.LEFT}, ${BANNER.TOP})">
    <rect width="${BANNER.WIDTH}" height="${BANNER.HEIGHT}" rx="${BANNER.RADIUS}" fill="url(#banner-grad)"/>
    <text x="${BANNER.WIDTH / 2}" y="${BANNER.BASELINE}" text-anchor="middle" font-family="${app.fontFamily}, sans-serif" font-weight="700" font-size="${BANNER.FONT_SIZE}" letter-spacing="${BANNER.LETTER_SPACING}" fill="white">${app.name.toUpperCase()}</text>
  </g>
</svg>`;
};
