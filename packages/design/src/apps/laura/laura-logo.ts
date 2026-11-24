import type { AppLogo } from "../../brand/aof-logo";
import { OCEAN_IMAGE_COLOR } from "../../designs/ocean/image-colors";
import { OCEAN_IMAGE_FONT } from "../../designs/ocean/image-font";

/** Laura's Brand logo: the Ocean Design's banner and face, set to its name. */
export const LAURA_LOGO = {
  banner: OCEAN_IMAGE_COLOR.BANNER,
  fontFamily: OCEAN_IMAGE_FONT.FAMILY,
  name: "Laura",
} as const satisfies AppLogo;
