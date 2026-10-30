import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { getPathname } from "@/features/i18n/navigation";
import { baseMetadata } from "./base-metadata";

/**
 * A page's `openGraph`: the layout's, with `og:url` on the page's public
 * address. Every page sets it, because the layout's `"./"` resolves to the
 * route Next renders (`/en/sign-in`), not the path next-intl serves without a
 * prefix (`/sign-in`). Spread from the base, images included: Next replaces
 * `openGraph` whole.
 */
export const pageOpenGraph = (pathname: string, locale: string) => ({
  ...baseMetadata(locale).openGraph,
  // Home's path is empty (`AUTH.PAGE.HOME`): the root.
  url: getPathname({ href: pathname || METADATA.PATH.ROOT, locale }),
});
