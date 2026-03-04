import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@allonfire/ui", "@allonfire/database"],
};

export default nextConfig;
