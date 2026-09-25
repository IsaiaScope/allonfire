import { SECURITY_HEADERS } from "@allonfire/utils/constants/security-headers";
import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "10mb",
    },
    staleTimes: {
      dynamic: 300,
    },
    // ponytail: the repo lives on an exFAT volume, where macOS writes `._*`
    // sidecar files next to Turbopack's numbered cache files and the cache fails
    // to load ("invalid digit found in string"). Off until the repo moves to APFS.
    turbopackFileSystemCacheForDev: false,
  },
  async headers() {
    return [
      {
        headers: SECURITY_HEADERS,
        source: "/(.*)",
      },
      {
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
        source: "/storage/:path*",
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ hostname: "picsum.photos" }],
  },
  output: "standalone",
  async rewrites() {
    const endpoint = process.env.MINIO_ENDPOINT;
    const bucket = process.env.MINIO_BUCKET;
    if (!(endpoint && bucket)) {
      return [];
    }
    return [
      {
        destination: `${endpoint}/${bucket}/:path*`,
        source: "/storage/:path*",
      },
    ];
  },
  transpilePackages: [
    "@allonfire/auth",
    "@allonfire/ui",
    "@allonfire/database",
    "@allonfire/storage",
    "@allonfire/utils",
  ],
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
