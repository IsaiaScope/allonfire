import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Reads the request config from src/features/i18n, next to the translations.
const withNextIntl = createNextIntlPlugin("./src/features/i18n/request.ts");

// Turbopack's file cache stays on (the default). On the exFAT drive macOS writes
// a `._*` sidecar next to each cache file and Turbopack fails to open the cache,
// so `dev` and `build` delete them under `.next` first; a no-op elsewhere.
const nextConfig: NextConfig = {
  cacheComponents: true,
  output: "standalone",
  reactCompiler: true,
  transpilePackages: ["@allonfire/shadcn", "@allonfire/ui"],
  typedRoutes: true,
};

export default withNextIntl(nextConfig);
