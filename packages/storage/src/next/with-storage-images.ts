import { TRAILING_SLASHES } from "@allonfire/utils/constants/patterns";
import type { NextConfig } from "next";
import {
  IMAGE_BUCKET,
  IMAGE_CACHE_TTL_SECONDS,
} from "../features/image/constants/bucket";
import { IMAGE_BASE_PATH } from "../shared/constants/paths";

/**
 * An App's Next config, able to show Images from storage: `/storage/images/:key`
 * proxied to the bucket, and next/image allowed to optimize only that path.
 * `origin` is MinIO as the App's server reaches it; rewrites are baked in at
 * build, so it must be set when building. A relative `src` is fetched
 * in-process, so Next 16's block on private-IP upstreams never applies.
 */
export const withStorageImages = (
  config: NextConfig,
  { origin }: { origin: string }
): NextConfig => {
  // One segment, never `:path*`: that also matches the bare prefix, and a
  // request for the bucket root would list every key in it. The origin loses
  // any trailing slash first, or the destination would read `//images`.
  const imageRewrite = {
    destination: `${origin.replace(TRAILING_SLASHES, "")}/${IMAGE_BUCKET}/:key`,
    source: `${IMAGE_BASE_PATH}/:key`,
  };
  return {
    ...config,
    images: {
      formats: ["image/avif", "image/webp"],
      minimumCacheTTL: IMAGE_CACHE_TTL_SECONDS,
      ...config.images,
      // Added to, never replaced: an App's own local images must not cut
      // every storage Image off the optimizer.
      localPatterns: [
        { pathname: `${IMAGE_BASE_PATH}/**`, search: "" },
        ...(config.images?.localPatterns ?? []),
      ],
    },
    rewrites: async () => {
      const own = (await config.rewrites?.()) ?? [];
      return Array.isArray(own)
        ? [imageRewrite, ...own]
        : { ...own, afterFiles: [imageRewrite, ...(own.afterFiles ?? [])] };
    },
  };
};
