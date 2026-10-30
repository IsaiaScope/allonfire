import { createNavigation } from "next-intl/navigation";
import type { HostLanguages } from "../../i18n/constants/locales";
import type { AOFDefineRouting } from "./aof-define-routing";

type Routing<L extends HostLanguages> = ReturnType<typeof AOFDefineRouting<L>>;

/**
 * next-intl's createNavigation (`Link` and the rest typed from the App's
 * routing), plus `languageLinks`: one link per language to `href` (an App
 * path without a locale) with the page's `query` kept (a filtered list stays
 * filtered), `current` the one `locale` speaks, with the attributes its `<a>`
 * takes. Always prefixed: under `as-needed` routing the
 * default language's bare path would let the proxy send a visitor back to
 * the language its cookie remembers.
 */
export const AOFCreateNavigation = <const L extends HostLanguages>(
  routing: Routing<L>
) => {
  const navigation = createNavigation(routing);
  const languageLinks = (href: string, locale: string, query = "") =>
    routing.locales.map((language) => {
      const current = language === locale;
      return {
        attributes: {
          "aria-current": current ? ("true" as const) : undefined,
          href: `${navigation.getPathname({
            forcePrefix: true,
            href,
            locale: language,
          })}${query && `?${query}`}`,
          lang: language,
        },
        current,
        language,
      };
    });
  return { ...navigation, languageLinks };
};
