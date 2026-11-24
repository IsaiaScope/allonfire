// @module-tag unit
// @vitest-environment node
import { I18N, type Language } from "../../../i18n/constants/locales";
import { METADATA } from "../../../metadata/constants/metadata";
import { pageTitle } from "../../../metadata/utils/page-title";
import { aofAppMetadata } from "../utils/aof-app-metadata";

// Any path but the root will do: core owns no pages.
const SIGN_IN = METADATA.PATH.ICON;
const HOME = "";
const NAME = "Test App";
const ALT = "Test App, Brand";
const ORIGIN = "https://app.test";
const WORDS = {
  en: { Metadata: { description: "In English" } },
  it: { Metadata: { description: "In italiano" } },
} as const;

/** What next-intl serves: the default language without a prefix. */
const getPathname = ({ href, locale }: { href: string; locale: Language }) =>
  locale === I18N.DEFAULT_LANGUAGE
    ? href
    : `/${locale}${href === METADATA.PATH.ROOT ? "" : href}`;

const app = aofAppMetadata({
  getPathname,
  indexing: METADATA.INDEXING.UNINDEXED,
  name: NAME,
  routing: { locales: I18N.BASE_LANGUAGES },
  shareImageAlt: ALT,
  translations: WORDS,
});
const { layoutMetadata, metadataText, pageOpenGraph } = app;

describe("pageOpenGraph", () => {
  it("gives the default language its public path, without a prefix", () => {
    expect(pageOpenGraph(SIGN_IN, "en").url).toBe(SIGN_IN);
  });

  it("prefixes every other language", () => {
    expect(pageOpenGraph(SIGN_IN, "it").url).toBe(`/it${SIGN_IN}`);
  });

  it("puts home at the root, and at the language's own root", () => {
    expect(pageOpenGraph(HOME, "en").url).toBe(METADATA.PATH.ROOT);
    expect(pageOpenGraph(HOME, "it").url).toBe("/it");
  });

  it("keeps the link-preview image, with its alt, in the page's language", () => {
    expect(pageOpenGraph(SIGN_IN, "it").images).toEqual([
      expect.objectContaining({
        ...METADATA.SHARE_IMAGE.SIZE,
        alt: ALT,
        url: `/it${METADATA.PATH.OPENGRAPH_IMAGE}`,
      }),
    ]);
  });

  it("keeps what the layout says about the App", () => {
    expect(pageOpenGraph(SIGN_IN, "it")).toMatchObject({
      alternateLocale: [METADATA.OG_LOCALE.en],
      locale: METADATA.OG_LOCALE.it,
      siteName: NAME,
      type: "website",
    });
  });
});

describe("layoutMetadata", () => {
  it("titles every page with the App's name after its own, and defaults to the name", () => {
    expect(layoutMetadata({ locale: "en", origin: ORIGIN }).title).toEqual({
      default: NAME,
      template: pageTitle("%s", NAME),
    });
  });

  it("is based on the origin and describes the App in the language", () => {
    const meta = layoutMetadata({ locale: "it", origin: ORIGIN });
    expect(meta.metadataBase?.href).toBe(`${ORIGIN}/`);
    expect(meta.description).toBe(WORDS.it.Metadata.description);
  });

  it("is not indexed when the App is private", () => {
    expect(layoutMetadata({ locale: "en", origin: ORIGIN }).robots).toEqual({
      follow: false,
      index: false,
    });
  });
});

describe("metadataText", () => {
  it("reads the words of a language", () => {
    expect(metadataText("it")("description")).toBe(
      WORDS.it.Metadata.description
    );
  });

  it("falls back to the default language for Next's build-time placeholder", () => {
    expect(metadataText("[locale]")("description")).toBe(
      WORDS[I18N.DEFAULT_LANGUAGE].Metadata.description
    );
  });
});
