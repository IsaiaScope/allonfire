import type {
  ColorScheme,
  LogoLayout,
} from "@allonfire/core/features/metadata/constants/metadata";
import {
  AOF_LOGO,
  type AppLogo,
  type Geometry,
  monogramBox,
  monogramDataUrl,
} from "@allonfire/design/brand/aof-logo";

export type AOFBrandLogoProps = {
  app: AppLogo;
  layout: LogoLayout;
  scheme: ColorScheme;
  /** Height in pixels; the width follows the layout's proportions. */
  height: number;
  /** Rounded corners, for a logo set on a page or card; an icon fills its square. */
  rounded?: boolean;
};

/**
 * An App's logo for `ImageResponse` (Satori): the same drawing as the
 * Brand's `aofLogoSvg` (`@allonfire/design/brand/aof-logo`), from the same
 * geometry, in flex and absolute layout with
 * inline styles. The monogram is a background, not an `<img>`: Satori draws
 * both, and no page renders this, so there is nothing for next/image to do.
 * The caller loads `app.fontFamily` into the response's fonts.
 */
export const AOFBrandLogo = ({
  app,
  height,
  layout,
  rounded = false,
  scheme,
}: AOFBrandLogoProps) => {
  const geometry: Geometry = AOF_LOGO.LAYOUT[layout];
  const { BANNER, DIVIDER } = geometry;
  const { ground, letter } = AOF_LOGO.SCHEME[scheme];
  const scale = height / geometry.HEIGHT;
  const box = monogramBox(geometry.MONOGRAM);
  return (
    <div
      style={{
        background: ground,
        borderRadius: rounded ? geometry.RADIUS * scale : 0,
        display: "flex",
        height,
        overflow: "hidden",
        position: "relative",
        width: geometry.WIDTH * scale,
      }}
    >
      <div
        style={{
          backgroundImage: `url(${monogramDataUrl(scheme)})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
          height: box.size * scale,
          left: box.left * scale,
          position: "absolute",
          top: box.top * scale,
          width: box.size * scale,
        }}
      />
      {DIVIDER ? (
        <div
          style={{
            background: letter,
            borderRadius: (DIVIDER.WIDTH / 2) * scale,
            height: DIVIDER.HEIGHT * scale,
            left: DIVIDER.X * scale,
            opacity: DIVIDER.OPACITY,
            position: "absolute",
            top: DIVIDER.Y * scale,
            width: DIVIDER.WIDTH * scale,
          }}
        />
      ) : null}
      <div
        style={{
          alignItems: "center",
          backgroundImage: `linear-gradient(90deg, ${app.banner.join(", ")})`,
          borderRadius: BANNER.RADIUS * scale,
          color: "white",
          display: "flex",
          fontFamily: app.fontFamily,
          fontSize: BANNER.FONT_SIZE * scale,
          fontWeight: 700,
          height: BANNER.HEIGHT * scale,
          justifyContent: "center",
          left: BANNER.LEFT * scale,
          letterSpacing: BANNER.LETTER_SPACING * scale,
          position: "absolute",
          textTransform: "uppercase",
          top: BANNER.TOP * scale,
          width: BANNER.WIDTH * scale,
        }}
      >
        {app.name}
      </div>
    </div>
  );
};
