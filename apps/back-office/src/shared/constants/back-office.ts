import type { AppLogo } from "@allonfire/design/brand/aof-logo";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { JAPAN_IMAGE_COLOR } from "@allonfire/design/designs/japan/image-colors";
import { JAPAN_IMAGE_FONT } from "@allonfire/design/designs/japan/image-font";

const NAME = "Back Office";

/** What the Back Office says about itself in its head, manifest and logo. */
export const BACK_OFFICE = {
  /** The Back Office's line in the Japan Design (the Line Rule). */
  LINE: JAPAN_IMAGE_COLOR.LINE.GREEN,
  LOGO: {
    /**
     * The banner, left to right: the Japan Design's blue, from a deeper
     * shade to the dark theme's primary. Laura's is green.
     */
    banner: [
      "#00588f",
      JAPAN_IMAGE_COLOR.light.primary,
      JAPAN_IMAGE_COLOR.dark.primary,
    ],
    fontFamily: JAPAN_IMAGE_FONT.FAMILY,
    name: NAME,
  },
  NAME,
  /** The link-preview image's alt, the same in every language: two names. */
  SHARE_IMAGE_ALT: `${NAME}, ${BRAND.NAME}`,
} as const satisfies { LOGO: AppLogo } & Record<string, unknown>;
