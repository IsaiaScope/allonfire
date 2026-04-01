import { securityHeaders } from "@allonfire/utils/security-headers";
import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  cacheComponents: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  experimental: {
    authInterrupts: true,
    staleTimes: {
      dynamic: 30,
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  transpilePackages: [
    "@allonfire/auth",
    "@allonfire/ui",
    "@allonfire/database",
    "@allonfire/content-generator",
  ],
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
    {
      source: "/_next/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ],
};

export default withBundleAnalyzer(nextConfig);
