// @module-tag unit
import { HTTP } from "../../../http/constants/http";
import { I18N } from "../../../i18n/constants/locales";
import { METADATA } from "../../../metadata/constants/metadata";
import { AOFBaseMetadata } from "../aof-base-metadata";

const APP_NAME = "Any App";
const base = {
  appName: APP_NAME,
  indexing: METADATA.INDEXING.UNINDEXED,
  locale: "it",
  locales: I18N.BASE_LANGUAGES,
} as const;

describe("AOFBaseMetadata", () => {
  it("keeps an unindexed App out of search", () => {
    expect(AOFBaseMetadata(base).robots).toEqual({
      follow: false,
      index: false,
    });
  });

  it("lets an indexed App be listed", () => {
    expect(
      AOFBaseMetadata({ ...base, indexing: METADATA.INDEXING.INDEXED }).robots
    ).toEqual({ follow: true, index: true });
  });

  it("describes the page for link previews in the request's language", () => {
    expect(AOFBaseMetadata(base).openGraph).toEqual({
      alternateLocale: [METADATA.OG_LOCALE.en],
      locale: METADATA.OG_LOCALE.it,
      siteName: APP_NAME,
      type: "website",
      url: "./",
    });
    expect(AOFBaseMetadata(base).twitter).toEqual({
      card: "summary_large_image",
    });
  });

  it("makes the App an iOS web app with launch screens", () => {
    const startupImage = [
      {
        media: "(orientation: portrait)",
        url: `${METADATA.PATH.LAUNCH_SCREEN}/any.png`,
      },
    ];
    const metadata = AOFBaseMetadata({ ...base, startupImage });
    expect(metadata.appleWebApp).toEqual({
      capable: true,
      startupImage,
      statusBarStyle: "default",
      title: APP_NAME,
    });
    // Next 15+ emits only mobile-web-app-capable; iOS launch screens need this one.
    expect(metadata.other).toEqual({
      "apple-mobile-web-app-capable": "yes",
      google: "notranslate",
    });
  });

  it("names the link-preview images, so a page's own openGraph keeps them", () => {
    const shareImage = { alt: "Any alt", height: 630, width: 1200 };
    const metadata = AOFBaseMetadata({ ...base, shareImage });
    expect(metadata.openGraph.images).toEqual([
      {
        ...shareImage,
        type: HTTP.CONTENT_TYPE.PNG,
        url: `/it${METADATA.PATH.OPENGRAPH_IMAGE}`,
      },
    ]);
    expect(metadata.twitter.images).toEqual([
      {
        ...shareImage,
        type: HTTP.CONTENT_TYPE.PNG,
        url: `/it${METADATA.PATH.TWITTER_IMAGE}`,
      },
    ]);
  });

  it("names no image for an App without one", () => {
    const metadata = AOFBaseMetadata(base);
    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(metadata.twitter).not.toHaveProperty("images");
  });

  it("stops iOS turning numbers, emails and addresses into links", () => {
    expect(AOFBaseMetadata(base).formatDetection).toEqual({
      address: false,
      email: false,
      telephone: false,
    });
  });

  it("never sets what each App and page must say", () => {
    const metadata = AOFBaseMetadata(base);
    expect(metadata).not.toHaveProperty("title");
    expect(metadata).not.toHaveProperty("description");
    expect(metadata).not.toHaveProperty("metadataBase");
  });
});
