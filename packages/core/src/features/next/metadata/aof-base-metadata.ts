import type { Metadata } from "next";
import { HTTP } from "../../http/constants/http";
import type { ContentLanguage } from "../../i18n/constants/locales";
import { type Indexing, METADATA } from "../../metadata/constants/metadata";

type Options = {
  /** The App's name: tab, iOS home-screen title, link-preview site name. */
  appName: string;
  indexing: Indexing;
  locale: ContentLanguage;
  locales: readonly ContentLanguage[];
  /** iOS launch screens, from `AOFLaunchScreenLinks`. */
  startupImage?: { url: string; media: string }[] | undefined;
  /**
   * The App's link-preview image (its `[locale]/opengraph-image` and
   * `twitter-image` files): its alt in this language and its pixel size.
   */
  shareImage?: { alt: string; height: number; width: number } | undefined;
};

/** The share image at the path Next serves that file from, under the locale; none without one. */
const imagesAt = (
  path: string,
  locale: ContentLanguage,
  image: Options["shareImage"]
) =>
  image
    ? {
        images: [
          { ...image, type: HTTP.CONTENT_TYPE.PNG, url: `/${locale}${path}` },
        ],
      }
    : {};

/**
 * What every App's root layout says the same way. The App spreads it and adds
 * `metadataBase`, `title` and `description`. The images are named here, not
 * left to the file convention, which a page's own `openGraph` would drop
 * (Next merges a segment's image files only into that segment's metadata).
 * The cost: their URLs carry no `?<hash>`, so a link-preview cache keeps an
 * old card until its own expiry.
 */
export const AOFBaseMetadata = ({
  appName,
  indexing,
  locale,
  locales,
  shareImage,
  startupImage,
}: Options) =>
  ({
    appleWebApp: {
      capable: true,
      ...(startupImage ? { startupImage } : {}),
      // Readable in both themes; black-translucent keeps white text and is
      // buggy on iOS 26.1+ (WebKit 301994, 305546).
      statusBarStyle: "default",
      title: appName,
    },
    applicationName: appName,
    formatDetection: { address: false, email: false, telephone: false },
    openGraph: {
      alternateLocale: locales
        .filter((other) => other !== locale)
        .map((other) => METADATA.OG_LOCALE[other]),
      ...imagesAt(METADATA.PATH.OPENGRAPH_IMAGE, locale, shareImage),
      locale: METADATA.OG_LOCALE[locale],
      siteName: appName,
      type: "website",
      // Resolved against metadataBase and the current path.
      url: "./",
    },
    other: {
      // Next 15+ emits only mobile-web-app-capable for `capable`; iOS shows
      // launch screens only with Apple's own tag.
      "apple-mobile-web-app-capable": "yes",
      // Every language ships; a browser's machine translation would only
      // rewrite React's DOM under it.
      google: "notranslate",
    },
    robots:
      indexing === METADATA.INDEXING.INDEXED
        ? { follow: true, index: true }
        : { follow: false, index: false },
    twitter: {
      card: "summary_large_image",
      ...imagesAt(METADATA.PATH.TWITTER_IMAGE, locale, shareImage),
    },
  }) satisfies Metadata;
