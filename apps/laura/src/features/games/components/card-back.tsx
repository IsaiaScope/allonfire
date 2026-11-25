import { OCEAN_CARD_BACK } from "@allonfire/design/designs/ocean/card-back";
import { AOFImage } from "@allonfire/ui/shared/components/aof-image";
import { cva } from "class-variance-authority";

/** One card back of a scheme, shown while the page wears that scheme. */
const face = cva("block size-full object-cover", {
  variants: {
    scheme: {
      dark: "hidden dark:block",
      light: "dark:hidden",
    },
  },
});

/**
 * The back of a Memory card: Laura's Li logo on the scheme's own ground, a
 * navy one by day and a gold one by night, the page's theme choosing.
 */
export const CardBack = () => (
  <>
    <AOFImage
      alt=""
      className={face({ scheme: "light" })}
      decoding="sync"
      height={OCEAN_CARD_BACK.HEIGHT}
      lcp
      sizes="25vw"
      src={OCEAN_CARD_BACK.LIGHT.DATA_URL}
      width={OCEAN_CARD_BACK.WIDTH}
    />
    <AOFImage
      alt=""
      className={face({ scheme: "dark" })}
      decoding="sync"
      height={OCEAN_CARD_BACK.HEIGHT}
      lcp
      sizes="25vw"
      src={OCEAN_CARD_BACK.DARK.DATA_URL}
      width={OCEAN_CARD_BACK.WIDTH}
    />
  </>
);
