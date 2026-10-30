import type { NextConfig } from "next";
import { METADATA } from "../../metadata/constants/metadata";
import type { AsNeededRouting } from "../metadata/aof-indexed";

/** Next's own assets and image optimizer: never a page. */
const NEXT_INTERNALS = "_next";

/** Stripped from a kept path before it is matched as the first segment. */
const LEADING_SLASH = /^\//;

/** The characters a regular expression reads as syntax; escaped in a kept path. */
const REGEX_SYNTAX = /[.*+?^${}()|[\]\\]/g;

/** The folders of the dynamic routes core gives every App. */
const CORE_ROUTES = [
  METADATA.PATH.LAUNCH_SCREEN,
  METADATA.PATH.LOGO,
  METADATA.PATH.MANIFEST_ICON,
];

type Options = {
  /** The App's next-intl routing: its languages and the default one. */
  routing: AsNeededRouting;
  /**
   * Paths the App serves from its own dynamic route outside `[locale]`: left
   * alone. Core's routes (launch screens, manifest icons, logos), static
   * files, static routes and the App's own rewrites, which answer first,
   * need no entry.
   */
  keep?: readonly string[];
};

/**
 * Gives every unknown URL the App's designed 404. An App's root layout sits
 * under `[locale]`, which matches any first segment: a path the proxy skips
 * (one with a dot, `/api/...`) reaches the layout with that segment as its
 * locale, the request config calls `notFound()` with no boundary above the
 * root layout, and Next answers its bare error shell. `global-not-found`
 * does not help: every URL matches `[locale]`, so none is unmatched.
 *
 * This rewrite runs after files and static routes and before dynamic ones: a
 * path whose first segment is not a language is rendered under the default
 * language, where the App's catch-all shows its not-found page, with a 404.
 */
export const AOFWithLocalizedNotFound = (
  config: NextConfig,
  { keep = [], routing }: Options
): NextConfig => {
  const kept = [...routing.locales, NEXT_INTERNALS, ...CORE_ROUTES, ...keep]
    .map((path) =>
      path.replace(LEADING_SLASH, "").replace(REGEX_SYNTAX, "\\$&")
    )
    .join("|");
  const toDefaultLanguage = {
    destination: `/${routing.defaultLocale}/:path`,
    // Next matches a source case-insensitively and routes case-sensitively:
    // `(?-i:` keeps `/IT/x.png` from passing as `it` into a bare 404.
    source: `/:path((?!(?-i:${kept})(?:/|$)).*)`,
  };
  return {
    ...config,
    rewrites: async () => {
      const own = (await config.rewrites?.()) ?? [];
      // Last, so the App's own rewrites answer first.
      return Array.isArray(own)
        ? [...own, toDefaultLanguage]
        : {
            ...own,
            afterFiles: [...(own.afterFiles ?? []), toDefaultLanguage],
          };
    },
  };
};
