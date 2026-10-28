import { AVATAR } from "../../avatar/constants/avatar";

/**
 * The image server (imgproxy) every stored picture is served by: the widths
 * a link is signed for and how long a private one lasts.
 */
export const IMAGE_SERVER = {
  /** An Avatar's one width: the stored file's own square. */
  AVATAR_WIDTH: AVATAR.SIZE,
  /**
   * The oldest a copy the image cache (nginx) serves can be before it asks
   * imgproxy again (a 1 s life, counted in whole seconds): a deleted or
   * renamed picture's link answers 404 within it.
   */
  CACHE_CHECK_SECONDS: 2,
  /** The hours a private picture's link lasts at least (`privateLinkExpiry`). */
  PRIVATE_LINK_HOURS: 1,
  /** One link per width in an Image's `srcSet`; stored at most 2560 wide. */
  WIDTHS: [640, 1080, 1920, 2560],
} as const;
