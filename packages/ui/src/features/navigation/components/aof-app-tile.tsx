import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { type AppLogo, aofLogoDataUrl } from "@allonfire/design/brand/aof-logo";
import { cva, type VariantProps } from "class-variance-authority";
import { AOFImage } from "../../../shared/components/aof-image";
import { cn } from "../../../shared/utils/utils";
import type { AppEntry } from "../types/app-descriptor";

const tile = cva("flex shrink-0 items-center justify-center", {
  defaultVariants: { size: "md" },
  variants: {
    size: {
      /** On the switcher's button. */
      lg: "size-12 rounded-lg group-data-[collapsible=icon]:size-10",
      /** In the switcher's menu, as the block's team rows. */
      md: "size-8 rounded-md border [&_svg]:size-4.5",
      /** Beside an App's name in a list (a User's card). */
      sm: "size-6 rounded-sm border [&_svg]:size-3.5",
    },
  },
});

/**
 * The logo's side on the largest tile (`size-12`), drawn 1.1 times larger
 * and cut by the tile: the square logo's empty frame would shrink its mark,
 * and a larger overscan puts the lettering against the tile's corners.
 */
const LOGO_SIZE = 53;

// One logo per theme, shown by the theme toggle's `.dark` class: `auto`
// would follow the system.
const SCHEMES = [
  METADATA.LOGO.SCHEME.LIGHT,
  METADATA.LOGO.SCHEME.DARK,
] as const;

const logoImage = cva("size-full max-w-none scale-110", {
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

export type AOFAppTileProps = VariantProps<typeof tile> & { entry: AppEntry };

/** An App's mark (the App switcher, a User's card), as the App's `entries`
 *  give it. */
export const AOFAppTile = ({ entry: { mark }, size }: AOFAppTileProps) => {
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
