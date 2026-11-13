import { UNIT } from "@allonfire/core/shared/constants/units";
import { AVATAR } from "../../avatar/constants/avatar";

/**
 * The oldest a copy the image cache (nginx) serves can be before it asks
 * imgproxy again (a 1 s life, counted in whole seconds).
 */
const CACHE_CHECK_SECONDS = 2;

/**
 * The image server (imgproxy) every stored picture is served by: the widths
 * a link is signed for and how long a private one lasts.
 */
export const IMAGE_SERVER = {
  /** An Avatar's one width: the stored file's own square. */
  AVATAR_WIDTH: AVATAR.SIZE,
  CACHE_CHECK_SECONDS,
  /**
   * How soon a deleted or renamed picture's link answers 404: the cache's
   * check, plus a second for the request already in flight.
   */
  GONE_WITHIN_MS: (CACHE_CHECK_SECONDS + 1) * UNIT.MS_PER_SECOND,
  /** The hours a private picture's link lasts at least (`privateLinkExpiry`). */
  PRIVATE_LINK_HOURS: 1,
  /**
   * One link per width in an Image's `srcSet`; stored at most 2560 wide. The
   * small ones are for tiles: a list's 48px thumbnail is 96 device pixels, a
   * phone card's 96px one 192, the Edit page's 160px one 320 (next/image asks
   * for each tile's size and its double, and the loader takes the smallest
   * link that covers it).
   */
  WIDTHS: [128, 256, 384, 640, 1080, 1920, 2560],
} as const;
