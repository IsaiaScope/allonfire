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
import { Link, usePathname } from "@/features/i18n/navigation";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { currentSection, SECTION, sectionHref } from "../constants/sections";

/**
 * Where you are: the Back Office, then the Section (the App's name hides on
 * a phone, as in shadcn's `sidebar-07`). On Home, Home alone.
 */
export const FrameBreadcrumb = () => {
  const t = useTranslations("Navigation");
  const section = currentSection(usePathname());
  const home = section === SECTION.HOME;
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
          <AOFBreadcrumbPage>{t(section.label)}</AOFBreadcrumbPage>
        </AOFBreadcrumbItem>
      </AOFBreadcrumbList>
    </AOFBreadcrumb>
  );
};
