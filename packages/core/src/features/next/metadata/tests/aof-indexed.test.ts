// @module-tag unit

import { I18N } from "../../../i18n/constants/locales";
import { METADATA } from "../../../metadata/constants/metadata";
import { AOFDefineRouting } from "../../i18n/aof-define-routing";
import {
  AOFAlternates,
  AOFRobots,
  AOFSitemapEntries,
  localizedPath,
} from "../aof-indexed";

const routing = AOFDefineRouting(I18N.BASE_LANGUAGES);
const ORIGIN = "https://example.test";
const HOME = METADATA.PATH.ROOT;
const PAGE = "/any-page";

describe("localizedPath", () => {
  it("prefixes every language but the default", () => {
    expect(localizedPath(HOME, "en", routing)).toBe(HOME);
    expect(localizedPath(HOME, "it", routing)).toBe("/it");
    expect(localizedPath(PAGE, "en", routing)).toBe(PAGE);
    expect(localizedPath(PAGE, "it", routing)).toBe(`/it${PAGE}`);
  });
});

describe("AOFAlternates", () => {
  it("points canonical at this language and lists every language plus x-default", () => {
    expect(AOFAlternates(PAGE, "it", routing)).toEqual({
      canonical: `/it${PAGE}`,
      languages: { en: PAGE, it: `/it${PAGE}`, "x-default": PAGE },
    });
  });
});

describe("AOFRobots", () => {
  it("never blocks crawling, so an unindexed App's noindex stays readable", () => {
    expect(
      AOFRobots({ indexing: METADATA.INDEXING.UNINDEXED, origin: ORIGIN })
    ).toEqual({ rules: { allow: HOME, userAgent: "*" } });
  });

  it("points an indexed App's crawlers at its sitemap", () => {
    expect(
      AOFRobots({ indexing: METADATA.INDEXING.INDEXED, origin: ORIGIN })
    ).toEqual({
      rules: { allow: HOME, userAgent: "*" },
      sitemap: `${ORIGIN}${METADATA.PATH.SITEMAP}`,
    });
  });
});

describe("AOFSitemapEntries", () => {
  it("lists each path once, with every language as an alternate", () => {
    expect(AOFSitemapEntries([HOME, PAGE], ORIGIN, routing)).toEqual([
      {
        alternates: { languages: { en: `${ORIGIN}/`, it: `${ORIGIN}/it` } },
        url: `${ORIGIN}/`,
      },
      {
        alternates: {
          languages: { en: `${ORIGIN}${PAGE}`, it: `${ORIGIN}/it${PAGE}` },
        },
        url: `${ORIGIN}${PAGE}`,
      },
    ]);
  });
});
