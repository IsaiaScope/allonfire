import type { NextConfig } from "next";
import { STORAGE } from "../../../shared/constants/paths";
import { storedObjectUrl } from "../../../shared/utils/stored-object-url";
import { IMAGE } from "../constants/image";

/**
 * An App's Next config, able to show Images from storage: `/storage/images/:key`
 * proxied to the bucket, and next/image allowed to optimize only that path.
 * `origin` is MinIO as the App's server reaches it; rewrites are baked in at
 * build, so it must be set when building; so must `bucket` (Production's by
 * default). A relative `src` is fetched
 * in-process, so Next 16's block on private-IP upstreams never applies.
 */
export const withStorageImages = (
  config: NextConfig,
  { bucket = IMAGE.BUCKET.DEFAULT, origin }: { bucket?: string; origin: string }
): NextConfig => {
  // One segment, never `:path*`: that also matches the bare prefix, and a
  // request for the bucket root would list every key in it.
  const imageRewrite = {
    destination: storedObjectUrl(origin, bucket, ":key"),
    source: `${STORAGE.PATH.IMAGE_PROXY}/:key`,
  };
  return {
    ...config,
    images: {
      formats: ["image/avif", "image/webp"],
      minimumCacheTTL: IMAGE.CACHE.TTL_SECONDS,
      ...config.images,
      // Added to, never replaced: an App's own local images must not cut
      // every storage Image off the optimizer.
      localPatterns: [
        { pathname: `${STORAGE.PATH.IMAGE_PROXY}/**`, search: "" },
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
