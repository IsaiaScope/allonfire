import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import type {
  AppDescriptor,
  AppSection,
  AppSubPage,
} from "../types/app-descriptor";

/**
 * A Section's position in its App's menu, two digits (Home is 01), for a
 * Design that numbers its places.
 */
export const sectionPosition = (
  app: Pick<AppDescriptor, "sections">,
  section: AppSection
) =>
  String(
    app.sections.findIndex(({ path }) => path === section.path) + 1
  ).padStart(2, "0");

/** A Section's own page's number under its Section's: 01, 02, in order. */
export const subPagePosition = (section: AppSection, page: AppSubPage) =>
  String((section.pages?.indexOf(page) ?? -1) + 1).padStart(2, "0");

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
export const sectionEntry = (section: {
  pages?: readonly { path: string }[] | undefined;
  path: string;
}) => sectionHref(section.pages?.[0]?.path ?? section.path);

/** The Section's own page `pathname` is on (`/services/mail/...`), if any. */
export const currentSubPage = <S extends AppSection>(
  section: S,
  pathname: string
) => section.pages?.find(({ path }) => isCurrentSection(pathname, path));

/** The Section `pathname` is on; Home (the first) when it is none of them. */
export const currentSection = <S extends AppSection>(
  app: Pick<AppDescriptor<S>, "sections">,
  pathname: string
): S =>
  app.sections.find(({ path }) => isCurrentSection(pathname, path)) ??
  app.sections[0];
