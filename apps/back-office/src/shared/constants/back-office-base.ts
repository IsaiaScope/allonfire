import { USER } from "@allonfire/auth/features/users/constants/users";
import type { AppLogo } from "@allonfire/design/brand/aof-logo";
import { JAPAN_IMAGE_COLOR } from "@allonfire/design/designs/japan/image-colors";
import { JAPAN_IMAGE_FONT } from "@allonfire/design/designs/japan/image-font";

const NAME = "Back Office";

/**
 * What the Back Office's other constants are built from, kept in a file of
 * its own so the Sections, the App entries and `BACK_OFFICE` can each read
 * it without reading one another.
 */
export const BACK_OFFICE_BASE = {
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
  /** The Back Office's own Sections' paths, after the locale. */
  PAGE: {
    /** The shared Services and their providers. */
    SERVICES: "/services",
    /** The MAIL Service's page, under Services. */
    SERVICES_MAIL: "/services/mail",
    STORAGE: "/storage",
    /** The Images page, under Storage. */
    STORAGE_IMAGES: "/storage/images",
    /** The Users list, at the path the User module serves them under. */
    USERS: USER.PATH.BASE,
  },
} as const satisfies { LOGO: AppLogo } & Record<string, unknown>;
