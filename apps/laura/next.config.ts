import { securityHeaders } from "@allonfire/utils/security-headers";
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
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ hostname: "picsum.photos" }],
  },
  output: "standalone",
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "10mb",
    },
    staleTimes: {
      dynamic: 300,
    },
  },
  transpilePackages: [
    "@allonfire/auth",
    "@allonfire/ui",
    "@allonfire/database",
    "@allonfire/storage",
    "@allonfire/utils",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/storage/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const endpoint = process.env.MINIO_ENDPOINT;
    const bucket = process.env.MINIO_BUCKET;
    if (!(endpoint && bucket)) {
      return [];
    }
    return [
      {
        source: "/storage/:path*",
        destination: `${endpoint}/${bucket}/:path*`,
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
