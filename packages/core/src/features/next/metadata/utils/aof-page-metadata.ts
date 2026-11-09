import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

/** An App's link preview for the page at `path`, in `locale`. */
type PageOpenGraph = (path: string, locale: string) => Metadata["openGraph"];

/**
 * An App's page metadata, from its own link preview: each page then gives
 * only its path and its title, as a translation's full key
 * (`"Users.add.title"`), read in the request's language. No title, and the
 * layout's stands alone, as on Home.
 */
export const AOFPageMetadata =
  (openGraph: PageOpenGraph) =>
  async (path: string, title?: string): Promise<Metadata> => {
    const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
    return {
      openGraph: openGraph(path, locale),
      ...(title && { title: t(title) }),
    };
  };
