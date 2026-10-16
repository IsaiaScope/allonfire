import type { Metadata, MetadataRoute } from "next";
import { objectFromEntries } from "../../../shared/utils/object";
import { type Indexing, METADATA } from "../../metadata/constants/metadata";

/** next-intl's as-needed routing, as `AOFDefineRouting` builds it. */
export type AsNeededRouting = {
  defaultLocale: string;
  locales: readonly string[];
};

const X_DEFAULT = "x-default";

/** A path as next-intl's as-needed prefix serves it in `locale`. */
export const localizedPath = (
  pathname: string,
  locale: string,
  { defaultLocale }: AsNeededRouting
) => {
  if (locale === defaultLocale) {
    return pathname;
  }
  return pathname === METADATA.PATH.ROOT
    ? `/${locale}`
    : `/${locale}${pathname}`;
};

/**
 * For an indexed App's pages: canonical in this language, every language as
 * an alternate and `x-default` on the default one. Relative to metadataBase.
 * An unindexed App leaves it out (search engines ignore it on noindex pages).
 */
export const AOFAlternates = (
  pathname: string,
  locale: string,
  routing: AsNeededRouting
) =>
  ({
    canonical: localizedPath(pathname, locale, routing),
    languages: {
      ...objectFromEntries(
        routing.locales.map((each) => [
          each,
          localizedPath(pathname, each, routing),
        ])
      ),
      [X_DEFAULT]: localizedPath(pathname, routing.defaultLocale, routing),
    },
  }) satisfies NonNullable<Metadata["alternates"]>;

/**
 * robots.txt for any App. Never `Disallow: /`: it would hide an unindexed
 * App's noindex from search engines and block preview bots that obey it.
 */
export const AOFRobots = ({
  indexing,
  origin,
}: {
  indexing: Indexing;
  origin: string;
}): MetadataRoute.Robots => ({
  rules: { allow: METADATA.PATH.ROOT, userAgent: "*" },
  ...(indexing === METADATA.INDEXING.INDEXED
    ? { sitemap: new URL(METADATA.PATH.SITEMAP, origin).href }
    : {}),
});

/** An indexed App's sitemap: each path in the default language, alternates for the rest. */
export const AOFSitemapEntries = (
  paths: readonly string[],
  origin: string,
  routing: AsNeededRouting
): MetadataRoute.Sitemap =>
  paths.map((pathname) => ({
    alternates: {
      languages: objectFromEntries(
        routing.locales.map((each) => [
          each,
          new URL(localizedPath(pathname, each, routing), origin).href,
        ])
      ),
    },
    url: new URL(
      localizedPath(pathname, routing.defaultLocale, routing),
      origin
    ).href,
  }));
