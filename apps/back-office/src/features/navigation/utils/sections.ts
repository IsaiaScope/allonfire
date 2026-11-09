import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { SECTION, SECTIONS, type Section } from "../constants/sections";

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

/** Where a Section's row goes: its first own page, else the Section itself. */
export const sectionEntry = (section: Section) =>
  sectionHref(section.pages?.[0]?.path ?? section.path);

/** The Section's own page `pathname` is on (`/services/mail/...`), if any. */
export const currentSubPage = (section: Section, pathname: string) =>
  section.pages?.find(({ path }) => isCurrentSection(pathname, path));

/** The Section `pathname` is on; Home when it is none of them. */
export const currentSection = (pathname: string): Section =>
  SECTIONS.find(({ path }) => isCurrentSection(pathname, path)) ?? SECTION.HOME;
