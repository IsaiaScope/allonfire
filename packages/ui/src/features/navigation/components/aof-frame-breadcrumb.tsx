"use client";

import { aofBaseNavigation } from "@allonfire/core/features/next/i18n/utils/aof-base-navigation";
import { cva } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { type ReactNode, Suspense } from "react";
import { NAVIGATION } from "../constants/navigation";
import type { AppDescriptor, AppSection } from "../types/app-descriptor";
import {
  currentSection,
  currentSubPage,
  sectionHref,
  sectionPosition,
  subPagePosition,
} from "../utils/sections";
import {
  AOFBreadcrumb,
  AOFBreadcrumbItem,
  AOFBreadcrumbLink,
  AOFBreadcrumbList,
  AOFBreadcrumbPage,
  AOFBreadcrumbSeparator,
} from "./aof-breadcrumb";

const { Link, usePathname } = aofBaseNavigation;

export type AOFFrameBreadcrumbProps = {
  /** The App: its name, its Sections (labels are keys of its `Navigation`). */
  app: Pick<AppDescriptor, "name" | "sections">;
  /**
   * Draws a crumb's position (`"00"` the App, `"02"` a Section) in the App's
   * Design; none, and no position shows. A function: only a client binding
   * of the App passes it. `label` is the key of the Section or page the crumb
   * stands for (`"memory"`), none for the App.
   */
  crumbMark?: (position: string, label?: string) => ReactNode;
};

/** One crumb: its mark beside its words, never wider than the header lets it. */
const crumbBox = cva("flex min-w-0 items-center gap-1.5");

/** The Section's crumb where you are: the page, or only a name over its own page's crumb. */
const SectionCrumb = ({
  children,
  named,
}: {
  children: ReactNode;
  named: boolean;
}) =>
  named ? (
    <span className={crumbBox()}>{children}</span>
  ) : (
    <AOFBreadcrumbPage className={crumbBox()}>{children}</AOFBreadcrumbPage>
  );

/**
 * Where you are: the App, then the Section (the App's name hides on a phone,
 * as in shadcn's `sidebar-07`), a link back to it from a page under it. On
 * Home, Home alone.
 */
const CurrentBreadcrumb = ({ app, crumbMark }: AOFFrameBreadcrumbProps) => {
  const t = useTranslations("Navigation");
  const common = useTranslations("Common.Navigation");
  const pathname = usePathname();
  const section: AppSection = currentSection(app, pathname);
  const [home] = app.sections;
  // One of the Section's own pages (`/services/mail`) follows it as a crumb.
  const sub = currentSubPage(section, pathname);
  // On a page under the Section (`/users/new`), the Section is a way back;
  // with its own pages, the Section only names where they sit.
  const below = !sub && pathname !== sectionHref(section.path);
  const crumb = (
    <>
      {crumbMark?.(sectionPosition(app, section), section.label)}
      <span className="truncate">{t(section.label)}</span>
    </>
  );
  const subCrumb = sub ? (
    <>
      {crumbMark?.(subPagePosition(section, sub), sub.label)}
      <span className="truncate">{t(sub.label)}</span>
    </>
  ) : null;
  return (
    <AOFBreadcrumb aria-label={common("breadcrumb")}>
      <AOFBreadcrumbList>
        {section === home ? null : (
          <>
            <AOFBreadcrumbItem className="hidden md:block">
              <AOFBreadcrumbLink
                className={crumbBox()}
                render={<Link href={sectionHref(home.path)} />}
              >
                {crumbMark?.(NAVIGATION.APP_POSITION)}
                <span className="truncate">{app.name}</span>
              </AOFBreadcrumbLink>
            </AOFBreadcrumbItem>
            <AOFBreadcrumbSeparator className="hidden md:block" />
          </>
        )}
        <AOFBreadcrumbItem>
          {below ? (
            <AOFBreadcrumbLink
              className={crumbBox()}
              render={<Link href={sectionHref(section.path)} prefetch />}
            >
              {crumb}
            </AOFBreadcrumbLink>
          ) : (
            <SectionCrumb named={Boolean(sub)}>{crumb}</SectionCrumb>
          )}
        </AOFBreadcrumbItem>
        {sub ? (
          <>
            <AOFBreadcrumbSeparator />
            <AOFBreadcrumbItem>
              {pathname === sectionHref(sub.path) ? (
                <AOFBreadcrumbPage className={crumbBox()}>
                  {subCrumb}
                </AOFBreadcrumbPage>
              ) : (
                <AOFBreadcrumbLink
                  className={crumbBox()}
                  render={<Link href={sectionHref(sub.path)} prefetch />}
                >
                  {subCrumb}
                </AOFBreadcrumbLink>
              )}
            </AOFBreadcrumbItem>
          </>
        ) : null}
      </AOFBreadcrumbList>
    </AOFBreadcrumb>
  );
};

/** The App's name alone: what a page whose address waits for the request prerenders. */
const AppBreadcrumb = ({ app, crumbMark }: AOFFrameBreadcrumbProps) => {
  const t = useTranslations("Common.Navigation");
  return (
    <AOFBreadcrumb aria-label={t("breadcrumb")}>
      <AOFBreadcrumbList>
        <AOFBreadcrumbItem>
          <AOFBreadcrumbPage className={crumbBox()}>
            {crumbMark?.(NAVIGATION.APP_POSITION)}
            <span className="truncate">{app.name}</span>
          </AOFBreadcrumbPage>
        </AOFBreadcrumbItem>
      </AOFBreadcrumbList>
    </AOFBreadcrumb>
  );
};

/**
 * The breadcrumb. Under a page whose address the build cannot know
 * (`/users/<id>`), the pathname waits for the request: the App's name is
 * prerendered in its place.
 */
export const AOFFrameBreadcrumb = (props: AOFFrameBreadcrumbProps) => (
  <Suspense fallback={<AppBreadcrumb {...props} />}>
    <CurrentBreadcrumb {...props} />
  </Suspense>
);
