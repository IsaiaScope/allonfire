import { UNIT } from "@allonfire/core/shared/constants/units";
import type { NextConfig } from "next";
import { AUTH } from "../../../shared/constants/auth";

/** A provider's picture keeps its address for the same content: kept a year. */
const PICTURE_TTL_SECONDS = UNIT.DAYS_PER_YEAR * UNIT.SECONDS_PER_DAY;

/**
 * An App's Next config, able to optimize a sign-in provider's picture (a
 * `User.image` Google wrote) as it does its own: resized, AVIF or WebP,
 * cached by the App's server, which fetches it, so a viewer's browser never
 * asks the provider. Over https only, added to the App's own patterns; AVIF
 * or WebP and a year's cache unless the App sets its own (both apply to every
 * image the optimizer serves).
 */
export const withProviderPictures = (config: NextConfig): NextConfig => ({
  ...config,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: PICTURE_TTL_SECONDS,
    ...config.images,
    remotePatterns: [
      ...AUTH.PICTURE_HOSTS.map((hostname) => ({
        hostname,
        protocol: "https" as const,
      })),
      ...(config.images?.remotePatterns ?? []),
    ],
  },
});
