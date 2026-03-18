import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
