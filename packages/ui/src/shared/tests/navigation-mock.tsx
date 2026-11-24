/**
 * The App's navigation as a test renders it. For the App's own module:
 * `vi.mock("@/features/i18n/navigation", () => import("@allonfire/ui/shared/tests/navigation-mock"))`.
 * For a shared piece, which reads core's base navigation instead:
 * `vi.mock("@allonfire/core/features/next/i18n/utils/aof-base-navigation", () => import("@allonfire/ui/shared/tests/navigation-mock"))`.
 */
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { LinkMock } from "./link-mock";

/** The address `usePathname` reports; a test moves it to navigate. */
export const navigationAt = { pathname: "/" };

export const Link = LinkMock;
export const usePathname = () => navigationAt.pathname;

/** One link per base language to `href`, as core's `languageLinks` returns them (prefixed always). */
export const languageLinks = (href: string, locale: string) =>
  I18N.BASE_LANGUAGES.map((language) => {
    const current = language === locale;
    return {
      attributes: {
        "aria-current": current ? ("true" as const) : undefined,
        href: `/${language}${href}`,
        lang: language,
      },
      current,
      language,
    };
  });

export const aofBaseNavigation = { Link, languageLinks, usePathname };
