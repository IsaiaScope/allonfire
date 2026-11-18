import {
  type ColorScheme,
  METADATA,
} from "@allonfire/core/features/metadata/constants/metadata";
import { AOFIconImage } from "@allonfire/core/features/next/metadata/components/aof-icon-images";
import type { AppLogo } from "@allonfire/design/brand/aof-logo";
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
 * `"use cache"` function stays in the App); `ground` says what the icon and
 * each launch screen sit on; `shareCardLook` is the Design's card colours.
 * `description` reads the card's line in a locale (`aofAppMetadata`'s
 * `metadataText`).
 */
export const aofAppImages = ({
  description,
  fonts,
  ground,
  line,
  logo,
  shareCardLook,
}: {
  description: (locale: string) => string;
  fonts: () => Promise<Fonts>;
  ground: { icon: string; launch: (scheme: ColorScheme) => string };
  /** The App's colour, as the card's band. */
  line: string;
  logo: AppLogo;
  shareCardLook: Omit<
    ComponentProps<typeof AOFShareCard>,
    "band" | "description" | "headline" | "logo"
  >;
}) => ({
  /** A square icon PNG, on the dark ground: no icon follows the viewer's theme. */
  iconImage: async (icon: { edge: number; inset: number }) =>
    AOFIconImage(icon, {
      fonts: await fonts(),
      ground: ground.icon,
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
    ground: ground.launch(scheme),
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
        {...shareCardLook}
        band={line}
        description={description(locale)}
        headline={logo.name}
        logo={logo}
      />,
      { ...METADATA.SHARE_IMAGE.SIZE, fonts: loaded }
    );
  },
});
