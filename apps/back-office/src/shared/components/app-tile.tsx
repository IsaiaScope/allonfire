import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import type { App } from "@allonfire/database/enums";
import { type AppLogo, aofLogoDataUrl } from "@allonfire/design/brand/aof-logo";
import { AOFImage } from "@allonfire/ui/components/aof-image";
import { cn } from "@allonfire/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { APP_ENTRY } from "@/shared/constants/apps";

const tile = cva("flex shrink-0 items-center justify-center", {
  defaultVariants: { size: "md" },
  variants: {
    size: {
      /** On the switcher's button. */
      lg: "size-12 rounded-lg group-data-[collapsible=icon]:size-9",
      /** In the switcher's menu, as the block's team rows. */
      md: "size-8 rounded-md border [&_svg]:size-4.5",
      /** Beside an App's name in a list (a User's card). */
      sm: "size-6 rounded-sm border [&_svg]:size-3.5",
    },
  },
});

/**
 * The logo's side on the largest tile (`size-12`), drawn 1.2 times larger
 * and cut by the tile: the square logo's empty frame would shrink its mark.
 */
const LOGO_SIZE = 58;

// One logo per theme, shown by the theme toggle's `.dark` class: `auto`
// would follow the system.
const SCHEMES = [
  METADATA.LOGO.SCHEME.LIGHT,
  METADATA.LOGO.SCHEME.DARK,
] as const;

const logoImage = cva("size-full max-w-none scale-120", {
  variants: {
    scheme: {
      [METADATA.LOGO.SCHEME.DARK]: "hidden dark:block",
      [METADATA.LOGO.SCHEME.LIGHT]: "dark:hidden",
    },
  },
});

/**
 * A logo's images, one per scheme: inlined in the HTML, so the logo paints
 * with the frame. Flat: at this size the shadow is under a pixel, and Safari
 * blurred it.
 */
const logoImages = (logo: AppLogo) =>
  SCHEMES.map((scheme) => ({
    scheme,
    src: aofLogoDataUrl({
      app: logo,
      flat: true,
      layout: METADATA.LOGO.LAYOUT.SQUARE,
      scheme,
    }),
  }));

export type AppTileProps = VariantProps<typeof tile> & { app: App };

/** An App's mark (the App switcher, a User's card), as `APP_ENTRY` gives
 *  it. */
export const AppTile = ({ app, size }: AppTileProps) => {
  const { mark } = APP_ENTRY[app];
  if ("icon" in mark) {
    return (
      <span aria-hidden className={tile({ size })}>
        <mark.icon />
      </span>
    );
  }
  return (
    <span aria-hidden className={cn(tile({ size }), "overflow-hidden")}>
      {logoImages(mark.logo).map(({ scheme, src }) => (
        <AOFImage
          alt=""
          className={logoImage({ scheme })}
          height={LOGO_SIZE}
          key={scheme}
          sizes={`${LOGO_SIZE}px`}
          src={src}
          width={LOGO_SIZE}
        />
      ))}
    </span>
  );
};
