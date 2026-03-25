import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  experimental: {
    authInterrupts: true,
  },
  transpilePackages: [
    "@allonfire/ui",
    "@allonfire/database",
    "@allonfire/content-generator",
  ],
};

export default nextConfig;
