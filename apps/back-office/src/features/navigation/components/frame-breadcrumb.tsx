"use client";

import {
  AOFBreadcrumb,
  AOFBreadcrumbItem,
  AOFBreadcrumbLink,
  AOFBreadcrumbList,
  AOFBreadcrumbPage,
  AOFBreadcrumbSeparator,
} from "@allonfire/ui/features/navigation/components/aof-breadcrumb";
import { useTranslations } from "next-intl";
import { type ReactNode, Suspense } from "react";
import { Link, usePathname } from "@/features/i18n/navigation";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { SECTION } from "../constants/sections";
import {
  currentSection,
  currentSubPage,
  sectionHref,
  stationNumber,
} from "../utils/sections";
import { StationNumber } from "./station-number";

/** The Section's crumb where you are: the page, or only a name over its own page's crumb. */
const SectionCrumb = ({
  children,
  named,
}: {
  children: ReactNode;
  named: boolean;
}) =>
  named ? (
    <span className="flex items-center gap-1.5">{children}</span>
  ) : (
    <AOFBreadcrumbPage className="flex items-center gap-1.5">
      {children}
    </AOFBreadcrumbPage>
  );

/**
 * Where you are: the Back Office, then the Section (the App's name hides on
 * a phone, as in shadcn's `sidebar-07`), a link back to it from a page under
 * it. On Home, Home alone.
 */
const CurrentBreadcrumb = () => {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const section = currentSection(pathname);
  const home = section === SECTION.HOME;
  // One of the Section's own pages (`/services/mail`) follows it as a crumb.
  const sub = currentSubPage(section, pathname);
  // On a page under the Section (`/users/new`), the Section is a way back;
  // with its own pages, the Section only names where they sit.
  const below = !sub && pathname !== sectionHref(section.path);
  const crumb = (
    <>
      <StationNumber number={stationNumber(section)} />
      {t(section.label)}
    </>
  );
  return (
    <AOFBreadcrumb aria-label={t("breadcrumb")}>
      <AOFBreadcrumbList>
        {home ? null : (
          <>
            <AOFBreadcrumbItem className="hidden md:block">
              <AOFBreadcrumbLink
                render={<Link href={sectionHref(SECTION.HOME.path)} />}
              >
                {BACK_OFFICE.NAME}
              </AOFBreadcrumbLink>
            </AOFBreadcrumbItem>
            <AOFBreadcrumbSeparator className="hidden md:block" />
          </>
        )}
        <AOFBreadcrumbItem>
          {below ? (
            <AOFBreadcrumbLink
              className="flex items-center gap-1.5"
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
                <AOFBreadcrumbPage>{t(sub.label)}</AOFBreadcrumbPage>
              ) : (
                <AOFBreadcrumbLink
                  render={<Link href={sectionHref(sub.path)} prefetch />}
                >
                  {t(sub.label)}
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
const AppBreadcrumb = () => {
  const t = useTranslations("Navigation");
  return (
    <AOFBreadcrumb aria-label={t("breadcrumb")}>
      <AOFBreadcrumbList>
        <AOFBreadcrumbItem>
          <AOFBreadcrumbPage>{BACK_OFFICE.NAME}</AOFBreadcrumbPage>
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
export const FrameBreadcrumb = () => (
  <Suspense fallback={<AppBreadcrumb />}>
    <CurrentBreadcrumb />
  </Suspense>
);
