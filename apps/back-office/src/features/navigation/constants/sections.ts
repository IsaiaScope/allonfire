import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { HardDrive, House, type LucideIcon, Users } from "lucide-react";
import { BACK_OFFICE } from "@/shared/constants/back-office";

/**
 * A Section's key in `Navigation` (its menu label and page title); `t()`
 * checks each against the translations where it is read.
 */
type SectionLabel = "home" | "storage" | "users";

export type Section = {
  icon: LucideIcon;
  label: SectionLabel;
  path: string;
};

/**
 * The Back Office's Sections, in menu order: the sidebar, the tab bar and the
 * proxy's sign-in gate all read this one list, and a test checks that every
 * page under `(signed-in)` is in it and gates itself. A path follows the
 * locale; Home's is empty (`AUTH.PAGE.HOME`).
 */
export const SECTION = {
  HOME: { icon: House, label: "home", path: AUTH.PAGE.HOME },
  STORAGE: {
    icon: HardDrive,
    label: "storage",
    path: BACK_OFFICE.PAGE.STORAGE,
  },
  USERS: { icon: Users, label: "users", path: BACK_OFFICE.PAGE.USERS },
} as const satisfies Record<string, Section>;

/** The menu's order: an explicit list, since Biome sorts the object's keys. */
export const SECTIONS = [SECTION.HOME, SECTION.USERS, SECTION.STORAGE] as const;

/** What a link to a Section points at: Home's empty path is the root. */
export const sectionHref = (path: string) => path || METADATA.PATH.ROOT;

/**
 * Whether `pathname` (next-intl's, without the locale) is that Section.
 * ponytail: exact match; a prefix match once a Section has pages under it,
 * never for Home, whose root would match everything.
 */
export const isCurrentSection = (pathname: string, path: string) =>
  pathname === sectionHref(path);
