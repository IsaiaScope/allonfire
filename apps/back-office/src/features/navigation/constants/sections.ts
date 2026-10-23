import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
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

/**
 * A Section's number on the Back Office's line, as a station's on a JR
 * sign: its place in the menu, two digits (Home is 01).
 */
export const stationNumber = (section: Section) =>
  String(SECTIONS.findIndex(({ path }) => path === section.path) + 1).padStart(
    2,
    "0"
  );

/** What a link to a Section points at: Home's empty path is the root. */
export const sectionHref = (path: string) => path || METADATA.PATH.ROOT;

/**
 * Whether `pathname` (next-intl's, without the locale) is that Section or a
 * page under it (`/users/<id>`). Never by prefix for Home, whose root would
 * match everything.
 */
export const isCurrentSection = (pathname: string, path: string) =>
  pathname === sectionHref(path) ||
  (path !== AUTH.PAGE.HOME && pathname.startsWith(`${path}/`));

/** The Section `pathname` is on; Home when it is none of them. */
export const currentSection = (pathname: string): Section =>
  SECTIONS.find(({ path }) => isCurrentSection(pathname, path)) ?? SECTION.HOME;
