"use client";

import {
  AOFBreadcrumb,
  AOFBreadcrumbItem,
  AOFBreadcrumbLink,
  AOFBreadcrumbList,
  AOFBreadcrumbPage,
  AOFBreadcrumbSeparator,
} from "@allonfire/ui/components/aof-breadcrumb";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link, usePathname } from "@/features/i18n/navigation";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import {
  currentSection,
  SECTION,
  sectionHref,
  stationNumber,
} from "../constants/sections";
import { StationNumber } from "./station-number";

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
  // On a page under the Section (`/users/new`), the Section is a way back.
  const below = pathname !== sectionHref(section.path);
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
              render={<Link href={sectionHref(section.path)} />}
            >
              {crumb}
            </AOFBreadcrumbLink>
          ) : (
            <AOFBreadcrumbPage className="flex items-center gap-1.5">
              {crumb}
            </AOFBreadcrumbPage>
          )}
        </AOFBreadcrumbItem>
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
