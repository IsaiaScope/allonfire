import { AUTH } from "@allonfire/auth/shared/constants/auth";
import type {
  AppSection,
  AppSubPage,
} from "@allonfire/ui/features/navigation/types/app-descriptor";
import {
  IconHome,
  IconMail,
  IconPhoto,
  IconServer2,
  IconServerCog,
  IconUsers,
} from "@tabler/icons-react";
import { BACK_OFFICE_BASE } from "@/shared/constants/back-office-base";

/**
 * A Section's key in `Navigation` (its menu label and page title); `t()`
 * checks each against the translations where it is read.
 */
type SectionLabel = "home" | "services" | "storage" | "users";

/** A Section's own page's key in `Navigation`, as the sub-menu names it. */
type SectionPageLabel = "images" | "mail";

/** One of a Section's own pages, listed under it in the sidebar. */
type SectionSubPage = AppSubPage & { label: SectionPageLabel };

/** The Back Office's Section: the shared one with its own keys for labels. */
export type Section = AppSection & {
  label: SectionLabel;
  pages?: readonly SectionSubPage[];
};

/**
 * The Back Office's Sections, in menu order: the sidebar and the proxy's
 * sign-in gate both read this one list, and a test checks that every
 * page under `(signed-in)` is in it and gates itself. A path follows the
 * locale; Home's is empty (`AUTH.PAGE.HOME`).
 */
export const SECTION = {
  HOME: { icon: IconHome, label: "home", path: AUTH.PAGE.HOME },
  SERVICES: {
    icon: IconServerCog,
    label: "services",
    pages: [
      {
        icon: IconMail,
        label: "mail",
        path: BACK_OFFICE_BASE.PAGE.SERVICES_MAIL,
      },
    ],
    path: BACK_OFFICE_BASE.PAGE.SERVICES,
  },
  STORAGE: {
    icon: IconServer2,
    label: "storage",
    pages: [
      {
        icon: IconPhoto,
        label: "images",
        path: BACK_OFFICE_BASE.PAGE.STORAGE_IMAGES,
      },
    ],
    path: BACK_OFFICE_BASE.PAGE.STORAGE,
  },
  USERS: { icon: IconUsers, label: "users", path: BACK_OFFICE_BASE.PAGE.USERS },
} as const satisfies Record<string, Section>;

/** The menu's order: an explicit list, since Biome sorts the object's keys. */
export const SECTIONS = [
  SECTION.HOME,
  SECTION.USERS,
  SECTION.STORAGE,
  SECTION.SERVICES,
] as const;
