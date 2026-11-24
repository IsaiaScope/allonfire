import type { AppLogo } from "../../brand/aof-logo";
import { JAPAN_IMAGE_COLOR } from "../../designs/japan/image-colors";
import { JAPAN_IMAGE_FONT } from "../../designs/japan/image-font";

/**
 * The Back Office's Brand logo: the Japan Design's line green, from a deeper
 * shade to the line itself, and its face, set to its name.
 */
export const BACK_OFFICE_LOGO = {
  banner: [
    "#1f6a42",
    JAPAN_IMAGE_COLOR.LINE.GREEN_DEEP,
    JAPAN_IMAGE_COLOR.LINE.GREEN,
  ],
  fontFamily: JAPAN_IMAGE_FONT.FAMILY,
  name: "Back Office",
} as const satisfies AppLogo;
