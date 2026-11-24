import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import {
  OCEAN_ART,
  type OceanArtKey,
} from "@allonfire/design/designs/ocean/mascot-art";
import { AOFImage } from "@allonfire/ui/shared/components/aof-image";
import type { ComponentPropsWithoutChildren } from "@allonfire/ui/shared/types/types";
import { cn } from "@allonfire/ui/shared/utils/utils";

/** The square an image is declared in: it is drawn at the caller's size, `object-contain`. */
const EDGE = 128;

export type OceanArtProps = ComponentPropsWithoutChildren<"span"> & {
  art: OceanArtKey;
};

/**
 * One picture of Ocean's pool (`OCEAN_ART`, which `MASCOT` assigns to each
 * moment), inlined as a data URL so it paints with the HTML. Full colour
 * wears the Emoji Rule's tight shadow, without which it fails 3:1 on the
 * light ground. A one-colour picture cannot read the page's colour as an
 * image, so it is a mask over the theme's primary. Decoration: the words
 * around it say what it shows. Size it with `className`.
 */
export const OceanArt = ({ art, className, ...props }: OceanArtProps) => {
  const picture = OCEAN_ART[art];
  const src = svgDataUrl(picture.SVG);
  if ("MONO" in picture) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block shrink-0 bg-current text-primary",
          className
        )}
        style={{
          maskImage: `url("${src}")`,
          maskPosition: "center",
          maskRepeat: "no-repeat",
          maskSize: "contain",
          WebkitMaskImage: `url("${src}")`,
          WebkitMaskPosition: "center",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskSize: "contain",
        }}
        {...props}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0", className)}
      {...props}
    >
      <AOFImage
        alt=""
        className="filter-(--emoji-shadow) size-full object-contain"
        height={EDGE}
        sizes={`${EDGE}px`}
        src={src}
        width={EDGE}
      />
    </span>
  );
};
