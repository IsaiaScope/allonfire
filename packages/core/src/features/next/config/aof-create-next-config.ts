import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { SECURITY_HEADERS } from "../../http/constants/security-headers";

/** core ships TypeScript source, so every App transpiles it. */
const BASE_TRANSPILE = ["@allonfire/core"];

type Options = {
  /** The App's workspace packages to transpile, added to `@allonfire/core`. */
  transpile?: string[] | undefined;
  /** Path to the App's next-intl request config; no `intl`, no plugin. */
  intl?: { requestConfig: string } | undefined;
};

/**
 * The Next config every App starts from. The App's own values win; its
 * headers come after the security headers, and Next sends the last rule that
 * sets a key, so an App header overrides a base one on the paths it matches.
 */
export const AOFCreateNextConfig = (
  config: NextConfig = {},
  { transpile = [], intl }: Options = {}
): NextConfig => {
  const merged: NextConfig = {
    /** Enables `"use cache"`, `cacheLife` and `cacheTag`, so parts of a page can be cached. */
    cacheComponents: true,
    /** Dev only: forwards every browser `console.*` call to the `next dev` terminal, not just warnings and errors. */
    logging: { browserToTerminal: true },
    /** Builds a self-contained `.next/standalone` server, the folder the Docker image runs. */
    output: "standalone",
    /** Drops the `X-Powered-By: Next.js` header, which only tells an attacker the stack. */
    poweredByHeader: false,
    /** Memoizes components and hooks at build time, so `useMemo`/`useCallback` are rarely needed. */
    reactCompiler: true,
    /** Type-checks `<Link href>` and `router.push` against the App's real routes. */
    typedRoutes: true,
    ...config,
    /** Every path gets the security headers; the App's rules come after them, so they win. */
    headers: async () => [
      { headers: SECURITY_HEADERS, source: "/(.*)" },
      ...((await config.headers?.()) ?? []),
    ],
    /** Workspace packages that ship TypeScript source, which Next must compile itself. */
    transpilePackages: [
      ...new Set([
        ...BASE_TRANSPILE,
        ...transpile,
        ...(config.transpilePackages ?? []),
      ]),
    ],
  };
  return intl ? createNextIntlPlugin(intl.requestConfig)(merged) : merged;
};
