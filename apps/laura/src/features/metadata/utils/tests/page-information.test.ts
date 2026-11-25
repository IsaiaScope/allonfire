// @module-tag unit
// @vitest-environment node

import { LOCAL } from "@allonfire/config/local/addresses";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import { getPathname } from "@/features/i18n/navigation";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { LAURA } from "@/shared/constants/laura";
import {
  layoutMetadata,
  metadataText,
  pageMetadata,
} from "../page-information";

const locale = vi.hoisted(() => ({ current: "en" }));

// Reading the request's language and words needs a Next runtime (and core
// resolves its own next-intl, which a mock here cannot reach): core's own test
// covers that, this one checks the link preview Laura binds under it.
vi.mock(
  "@allonfire/core/features/next/metadata/utils/aof-page-metadata",
  () => ({
    AOFPageMetadata:
      (openGraph: (path: string, language: string) => unknown) =>
      async (path: string) => ({ openGraph: openGraph(path, locale.current) }),
  })
);

describe("pageMetadata", () => {
  it.each(I18N.BASE_LANGUAGES)(
    "puts a page's link preview on its public address in %s",
    async (language) => {
      locale.current = language;
      const { openGraph } = await pageMetadata(LAURA.PAGE.FAVORITES);
      expect(openGraph).toMatchObject({
        url: getPathname({ href: LAURA.PAGE.FAVORITES, locale: language }),
      });
    }
  );

  it("puts Home at its language's root", async () => {
    locale.current = I18N.DEFAULT_LANGUAGE;
    const { openGraph } = await pageMetadata("");
    expect(openGraph).toMatchObject({
      url: getPathname({
        href: METADATA.PATH.ROOT,
        locale: I18N.DEFAULT_LANGUAGE,
      }),
    });
  });
});

describe("layoutMetadata", () => {
  const metadata = layoutMetadata({
    locale: I18N.DEFAULT_LANGUAGE,
    origin: LOCAL.URL.LAURA,
  });

  it("titles every page with Laura's name", () => {
    expect(metadata.title).toEqual({
      default: LAURA.name,
      template: pageTitle("%s", LAURA.name),
    });
  });

  it("describes Laura in the language asked", () => {
    expect(metadata.description).toBe(EN.Metadata.description);
    expect(
      layoutMetadata({ locale: "it", origin: LOCAL.URL.LAURA }).description
    ).toBe(IT.Metadata.description);
  });

  it("builds absolute addresses from the origin", () => {
    expect(metadata.metadataBase?.href).toBe(`${LOCAL.URL.LAURA}/`);
  });

  it("keeps the link-preview image's alt", () => {
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        ...METADATA.SHARE_IMAGE.SIZE,
        alt: LAURA.shareImageAlt,
      }),
    ]);
  });
});

describe("metadataText", () => {
  it("falls back to the default language for a language Laura does not route", () => {
    expect(metadataText("xx")("description")).toBe(EN.Metadata.description);
  });
});
