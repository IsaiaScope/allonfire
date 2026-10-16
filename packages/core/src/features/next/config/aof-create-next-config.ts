import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { env } from "../../../environment/environment";
import { ENV } from "../../../shared/constants/env";
import { HTTP } from "../../http/constants/http";
import { type Indexing, METADATA } from "../../metadata/constants/metadata";
import { tailnetHosts } from "./tailnet-hosts";

/** core ships TypeScript source, so every App transpiles it. */
const BASE_TRANSPILE = ["@allonfire/core"];

/**
 * Dev only: Next checks it for its dev assets and HMR, never in a build, so
 * Tailscale is asked only by `next dev`.
 */
const devOrigins = () =>
  env.NODE_ENV === ENV.NODE.DEVELOPMENT ? tailnetHosts() : [];

/**
 * On macOS no optimized image is kept on disk. On a non-Apple volume (the
 * repo's exFAT drive) macOS writes a `._*` sidecar beside each cached image,
 * and Next serves the folder's first file, the sidecar, as the image. The
 * Docker and CI builds run on Linux and keep the cache.
 */
const diskImageCache = () =>
  process.platform === "darwin" ? { maximumDiskCacheSize: 0 } : {};

type Options = {
  /** The App's workspace packages to transpile, added to `@allonfire/core`. */
  transpile?: string[] | undefined;
  /** Path to the App's next-intl request config; no `intl`, no plugin. */
  intl?: { requestConfig: string } | undefined;
  /**
   * The App's Indexing, from `ACCESS.APP_SETTINGS`. Unindexed (the default,
   * so an App that forgets is never listed) sends `X-Robots-Tag` on every path.
   */
  indexing?: Indexing | undefined;
};

/**
 * The Next config every App starts from. The App's own values win; its
 * headers come after the security headers, and Next sends the last rule that
 * sets a key, so an App header overrides a base one on the paths it matches.
 */
export const AOFCreateNextConfig = (
  config: NextConfig = {},
  { transpile = [], intl, indexing = METADATA.INDEXING.UNINDEXED }: Options = {}
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
    /** Dev only: every name on this machine's tailnet (the Apps' Tailscale Services) can load the dev server's assets and HMR; no other tailnet can. */
    allowedDevOrigins: [...devOrigins(), ...(config.allowedDevOrigins ?? [])],
    /** Every path gets the security headers, an unindexed App's also `X-Robots-Tag`; the App's rules come after them, so they win. */
    headers: async () => [
      {
        headers:
          indexing === METADATA.INDEXING.INDEXED
            ? HTTP.SECURITY_HEADERS
            : [
                ...HTTP.SECURITY_HEADERS,
                {
                  key: HTTP.HEADER.X_ROBOTS_TAG,
                  value: METADATA.ROBOTS.NOINDEX,
                },
              ],
        source: "/(.*)",
      },
      ...((await config.headers?.()) ?? []),
    ],
    /** The optimized images Next keeps on disk: none on macOS (`diskImageCache`). */
    images: { ...diskImageCache(), ...config.images },
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
