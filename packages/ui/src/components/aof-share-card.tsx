import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import type { AppLogo } from "@allonfire/design/brand/aof-logo";
import { AOFBrandLogo } from "./aof-brand-logo";

/** The card's geometry, in pixels of its 1200x630. */
const CARD = {
  BAND: 20,
  DESCRIPTION: 32,
  GAP: 64,
  GUTTER: 80,
  HEADLINE: 66,
  /** The logo's height: square, so its width too. */
  LOGO: 300,
  TEXT_GAP: 24,
} as const;

/**
 * How a Design dresses the card, as data: its scheme's colours, the face its
 * image fonts load, and an optional strip along the bottom edge (the Japan
 * Design's tactile paving), drawn as a background image.
 */
export type ShareCardLook = {
  colors: { background: string; foreground: string; mutedForeground: string };
  edge?: { height: number; image: string };
  fontFamily: string;
};

export type AOFShareCardProps = ShareCardLook & {
  /** The App's colour as a band along the top (Japan: the App's line). */
  band: string;
  description: string;
  /** What the card says first; the logo's banner already names the App. */
  headline: string;
  /** The App's logo, which the card draws square, dark and rounded: a
   *  preview shows it on any background, whatever the viewer's theme. */
  logo: AppLogo;
};

/**
 * A link-preview card (Open Graph and X, 1200x630) for `ImageResponse`
 * (Satori: flex, inline styles): the App's band along the top, its logo
 * (every App's the same size and scheme) beside a headline and a description, and the Design's edge along the
 * bottom. The caller loads `fontFamily` into the response's fonts.
 */
export const AOFShareCard = ({
  band,
  colors,
  description,
  edge,
  fontFamily,
  headline,
  logo,
}: AOFShareCardProps) => (
  <div
    style={{
      background: colors.background,
      color: colors.foreground,
      display: "flex",
      flexDirection: "column",
      fontFamily,
      height: "100%",
      width: "100%",
    }}
  >
    <div style={{ background: band, height: CARD.BAND }} />
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flex: 1,
        gap: CARD.GAP,
        padding: `0 ${CARD.GUTTER}px`,
      }}
    >
      <AOFBrandLogo
        app={logo}
        height={CARD.LOGO}
        layout={METADATA.LOGO.LAYOUT.SQUARE}
        rounded
        scheme={METADATA.COLOR_SCHEME.DARK}
      />
      {/* Takes the width the logo leaves, so the text wraps inside the card. */}
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: CARD.TEXT_GAP,
        }}
      >
        <span
          style={{
            fontSize: CARD.HEADLINE,
            fontWeight: 700,
            letterSpacing: -1,
            lineHeight: 1.1,
          }}
        >
          {headline}
        </span>
        <span
          style={{
            color: colors.mutedForeground,
            fontSize: CARD.DESCRIPTION,
            lineHeight: 1.35,
          }}
        >
          {description}
        </span>
      </div>
    </div>
    {edge ? (
      <div
        style={{ backgroundImage: `url(${edge.image})`, height: edge.height }}
      />
    ) : null}
  </div>
);
