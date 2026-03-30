import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    formats: ["image/avif", "image/webp"],
  },
  output: "standalone",
  experimental: {
    authInterrupts: true,
  },
  transpilePackages: [
    "@allonfire/auth",
    "@allonfire/ui",
    "@allonfire/database",
    "@allonfire/storage",
  ],
  async headers() {
    return [
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
    return [
      {
        source: "/storage/:path*",
        destination: `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
