import { createTranslator } from "next-intl";
import { cache } from "react";
import {
  I18N,
  type Language,
  languageSchema,
} from "../../../i18n/constants/locales";
import type { Indexing } from "../../../metadata/constants/metadata";
import { METADATA } from "../../../metadata/constants/metadata";
import { pageTitle } from "../../../metadata/utils/page-title";
import { AOFBaseMetadata } from "./aof-base-metadata";
import { AOFPageMetadata } from "./aof-page-metadata";

// The default language for a locale the App does not route: Next collects an
// image's metadata at build with a placeholder for `[locale]`.
const localeSchema = languageSchema.catch(I18N.DEFAULT_LANGUAGE);

/**
 * Everything an App's head says, from the App's own values: the base every
 * layout spreads, each page's link preview and metadata, the layout's whole
 * `Metadata`, and the `Metadata` words read without next-intl's request
 * config (an image file is a Route Handler, where `getTranslations` is not
 * available). The App binds it once (`shared/constants/page-information`).
 */
export const aofAppMetadata = ({
  getPathname,
  indexing,
  name,
  routing,
  shareImageAlt,
  startupImage,
  translations,
}: {
  /** The App's navigation `getPathname`: where a page is served in a language. */
  getPathname: (options: { href: string; locale: Language }) => string;
  indexing: Indexing;
  /** The App's name: tab, iOS home-screen title, link-preview site name. */
  name: string;
  routing: { locales: readonly Language[] };
  shareImageAlt: string;
  /** iOS launch screens, from `AOFLaunchScreenLinks`. */
  startupImage?: { media: string; url: string }[] | undefined;
  translations: Record<Language, { Metadata: { description: string } }>;
}) => {
  const metadataText = (locale: string) => {
    const language = localeSchema.parse(locale);
    return createTranslator({
      locale: language,
      messages: translations[language],
      namespace: "Metadata",
    });
  };

  /** Cached per request: the layout and the page's `pageOpenGraph` both read it. */
  const baseMetadata = cache((locale: string) =>
    AOFBaseMetadata({
      appName: name,
      indexing,
      locale: languageSchema.parse(locale),
      locales: routing.locales,
      shareImage: { ...METADATA.SHARE_IMAGE.SIZE, alt: shareImageAlt },
      startupImage,
    })
  );

  /**
   * A page's `openGraph`: the layout's, with `og:url` on the page's public
   * address (the layout's `"./"` resolves to the route Next renders, not the
   * path next-intl serves without a prefix). Spread from the base, images
   * included: Next replaces `openGraph` whole.
   */
  const pageOpenGraph = (pathname: string, locale: string) => ({
    ...baseMetadata(locale).openGraph,
    // Home's path is empty: the root.
    url: getPathname({
      href: pathname || METADATA.PATH.ROOT,
      locale: languageSchema.parse(locale),
    }),
  });

  return {
    /** The root layout's `generateMetadata`. */
    layoutMetadata: ({
      locale,
      origin,
    }: {
      locale: string;
      origin: string;
    }) => ({
      ...baseMetadata(locale),
      description: metadataText(locale)("description"),
      metadataBase: new URL(origin),
      title: { default: name, template: pageTitle("%s", name) },
    }),
    metadataText,
    pageMetadata: AOFPageMetadata(pageOpenGraph),
    pageOpenGraph,
  };
};
