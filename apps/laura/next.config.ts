import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
      {
        protocol: "https",
        hostname: "minio.allonfire.com",
      },
    ],
  },
};

export default nextConfig;
