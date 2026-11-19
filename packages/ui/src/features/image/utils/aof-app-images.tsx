import {
  type ColorScheme,
  METADATA,
} from "@allonfire/core/features/metadata/constants/metadata";
import { AOFIconImage } from "@allonfire/core/features/next/metadata/components/aof-icon-images";
import type { AppLogo } from "@allonfire/design/brand/aof-logo";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { ImageResponse } from "next/og";
import type { ComponentProps } from "react";
import { AOFBrandLogo } from "../components/aof-brand-logo";
import { AOFShareCard } from "../components/aof-share-card";

/** What `AOFIconImage` and a launch screen draw with: the App's mark on a ground, and fonts. */
type MarkImage = Parameters<typeof AOFIconImage>[1];
type Fonts = NonNullable<MarkImage["fonts"]>;

/**
 * The images an App generates, from the App's own values: its icons (the
 * apple-touch-icon and the manifest's), the iOS launch screen per colour
 * scheme and the link-preview card. `fonts` is the Design's slot (a
 * `"use cache"` function stays in the App); the icon sits on the Brand's
 * ground (it draws the logo's dark scheme) and each launch screen on its
 * scheme's `imageColor` background; `shareCard` is the Design's card colours,
 * the light one drawn. `metadataText` is `aofAppMetadata`'s: the card's line
 * is the `description` it reads in the locale.
 */
export const aofAppImages = ({
  fonts,
  band,
  imageColor,
  logo,
  metadataText,
  shareCard,
}: {
  /** The colour of the card's band along the top. */
  band: string;
  fonts: () => Promise<Fonts>;
  imageColor: Record<ColorScheme, { background: string }>;
  logo: AppLogo;
  metadataText: (locale: string) => (key: "description") => string;
  shareCard: Record<
    ColorScheme,
    Omit<
      ComponentProps<typeof AOFShareCard>,
      "band" | "description" | "headline" | "logo"
    >
  >;
}) => ({
  /** A square icon PNG, on the dark ground: no icon follows the viewer's theme. */
  iconImage: async (icon: { edge: number; inset: number }) =>
    AOFIconImage(icon, {
      fonts: await fonts(),
      ground: BRAND.GROUND,
      mark: (edge) => (
        <AOFBrandLogo
          app={logo}
          height={edge}
          layout={METADATA.LOGO.LAYOUT.SQUARE}
          scheme={METADATA.COLOR_SCHEME.DARK}
        />
      ),
    }),
  /** How the mark looks on a launch screen in a scheme (`AOFLaunchScreenRoute`'s callback). */
  launchScreen: async (scheme: ColorScheme): Promise<MarkImage> => ({
    fonts: await fonts(),
    ground: imageColor[scheme].background,
    mark: (edge) => (
      <AOFBrandLogo
        app={logo}
        height={edge}
        layout={METADATA.LOGO.LAYOUT.SQUARE}
        rounded
        scheme={scheme}
      />
    ),
  }),
  /** The link-preview card, the same for Open Graph and X, in the `[locale]` the image file sits under. */
  shareImage: async ({ params }: { params: Promise<{ locale: string }> }) => {
    const [{ locale }, loaded] = await Promise.all([params, fonts()]);
    return new ImageResponse(
      <AOFShareCard
        {...shareCard[METADATA.COLOR_SCHEME.LIGHT]}
        band={band}
        description={metadataText(locale)("description")}
        headline={logo.name}
        logo={logo}
      />,
      { ...METADATA.SHARE_IMAGE.SIZE, fonts: loaded }
    );
  },
});
