import { USER } from "@allonfire/auth/features/users/constants/users";
import { BACK_OFFICE_LOGO } from "@allonfire/design/apps/back-office/back-office-logo";
import type { AppLogo } from "@allonfire/design/brand/aof-logo";

const NAME = BACK_OFFICE_LOGO.name;

/**
 * What the Back Office's other constants are built from, kept in a file of
 * its own so the Sections, the App entries and `BACK_OFFICE` can each read
 * it without reading one another.
 */
export const BACK_OFFICE_BASE = {
  /** The Brand logo, which the design package holds. */
  LOGO: BACK_OFFICE_LOGO,
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
