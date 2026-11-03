import { AUTH } from "@allonfire/auth/shared/constants/auth";
import {
  IconHome,
  IconServer2,
  IconUsers,
  type TablerIcon,
} from "@tabler/icons-react";
import { BACK_OFFICE } from "@/shared/constants/back-office";

/**
 * A Section's key in `Navigation` (its menu label and page title); `t()`
 * checks each against the translations where it is read.
 */
type SectionLabel = "home" | "storage" | "users";

export type Section = {
  icon: TablerIcon;
  label: SectionLabel;
  path: string;
};

/**
 * The Back Office's Sections, in menu order: the sidebar and the proxy's
 * sign-in gate both read this one list, and a test checks that every
 * page under `(signed-in)` is in it and gates itself. A path follows the
 * locale; Home's is empty (`AUTH.PAGE.HOME`).
 */
export const SECTION = {
  HOME: { icon: IconHome, label: "home", path: AUTH.PAGE.HOME },
  STORAGE: {
    icon: IconServer2,
    label: "storage",
    path: BACK_OFFICE.PAGE.STORAGE,
  },
  USERS: { icon: IconUsers, label: "users", path: BACK_OFFICE.PAGE.USERS },
} as const satisfies Record<string, Section>;

/** The menu's order: an explicit list, since Biome sorts the object's keys. */
export const SECTIONS = [SECTION.HOME, SECTION.USERS, SECTION.STORAGE] as const;
