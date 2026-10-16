// @module-tag unit

import { ENV } from "../../../../shared/constants/env";
import { HTTP } from "../../../http/constants/http";
import { METADATA } from "../../../metadata/constants/metadata";
import { AOFCreateNextConfig } from "../aof-create-next-config";
import { tailnetHosts } from "../tailnet-hosts";

vi.mock("../tailnet-hosts", () => ({ tailnetHosts: vi.fn(() => []) }));
const runtime = vi.hoisted(() => ({ NODE_ENV: "test" }));
vi.mock("../../../../environment/environment", () => ({ env: runtime }));

const TAILNET_HOST = "*.tailnet.ts.net";

vi.mock("next-intl/plugin", () => ({
  default: (requestConfig: string) => (config: object) => ({
    ...config,
    env: { INTL_REQUEST_CONFIG: requestConfig },
  }),
}));

/** Runs `build` as if Node ran on `value`, then puts the real platform back. */
const onPlatform = <T>(value: NodeJS.Platform, build: () => T): T => {
  const { platform } = process;
  Object.defineProperty(process, "platform", { value });
  try {
    return build();
  } finally {
    Object.defineProperty(process, "platform", { value: platform });
  }
};

const APP_HEADER = { key: "X-Frame-Options", value: "SAMEORIGIN" };
const UNINDEXED_HEADERS = [
  ...HTTP.SECURITY_HEADERS,
  { key: HTTP.HEADER.X_ROBOTS_TAG, value: METADATA.ROBOTS.NOINDEX },
];

describe("AOFCreateNextConfig", () => {
  it("sets the AllOnFire base", () => {
    expect(AOFCreateNextConfig()).toMatchObject({
      cacheComponents: true,
      logging: { browserToTerminal: true },
      output: "standalone",
      poweredByHeader: false,
      reactCompiler: true,
      transpilePackages: ["@allonfire/core"],
      typedRoutes: true,
    });
  });

  // `tailscale serve` answers on each App's Service name
  // (back-office.tailnet.ts.net): the dev server's assets and HMR must
  // accept them, and no other tailnet's site.
  it("lets this machine's tailnet names open the dev server, in dev", () => {
    runtime.NODE_ENV = ENV.NODE.DEVELOPMENT;
    vi.mocked(tailnetHosts).mockReturnValue([TAILNET_HOST]);
    expect(
      AOFCreateNextConfig({ allowedDevOrigins: ["other.test"] })
        .allowedDevOrigins
    ).toEqual([TAILNET_HOST, "other.test"]);
    runtime.NODE_ENV = ENV.NODE.TEST;
  });

  it("asks Tailscale nothing outside dev", () => {
    vi.mocked(tailnetHosts).mockClear();
    expect(AOFCreateNextConfig().allowedDevOrigins).toEqual([]);
    expect(tailnetHosts).not.toHaveBeenCalled();
  });

  it("merges the App's packages to transpile without duplicates", () => {
    const config = AOFCreateNextConfig(
      { transpilePackages: ["@allonfire/ui"] },
      { transpile: ["@allonfire/design", "@allonfire/ui", "@allonfire/core"] }
    );
    expect(config.transpilePackages).toEqual([
      "@allonfire/core",
      "@allonfire/design",
      "@allonfire/ui",
    ]);
  });

  it("lets the App's values win over the base", () => {
    expect(AOFCreateNextConfig({ typedRoutes: false }).typedRoutes).toBe(false);
  });

  it("sends the security headers first and the App's after, so the App's win", async () => {
    const config = AOFCreateNextConfig({
      headers: async () => [{ headers: [APP_HEADER], source: "/embed" }],
    });
    expect(await config.headers?.()).toEqual([
      { headers: UNINDEXED_HEADERS, source: "/(.*)" },
      { headers: [APP_HEADER], source: "/embed" },
    ]);
  });

  it("keeps an unindexed App out of search on every path, by default", async () => {
    const headers = await AOFCreateNextConfig().headers?.();
    expect(headers?.[0]).toEqual({
      headers: UNINDEXED_HEADERS,
      source: "/(.*)",
    });
  });

  it("sends no X-Robots-Tag for an indexed App", async () => {
    const headers = await AOFCreateNextConfig(
      {},
      { indexing: METADATA.INDEXING.INDEXED }
    ).headers?.();
    expect(headers?.[0]).toEqual({
      headers: HTTP.SECURITY_HEADERS,
      source: "/(.*)",
    });
  });

  it("adds next-intl's plugin only when asked", () => {
    expect(AOFCreateNextConfig().env).toBeUndefined();
    expect(
      AOFCreateNextConfig({}, { intl: { requestConfig: "./request.ts" } }).env
    ).toEqual({ INTL_REQUEST_CONFIG: "./request.ts" });
  });

  it("keeps no optimized images on disk on macOS, keeping the App's own image options", () => {
    expect(
      onPlatform("darwin", () =>
        AOFCreateNextConfig({ images: { minimumCacheTTL: 60 } })
      ).images
    ).toEqual({ maximumDiskCacheSize: 0, minimumCacheTTL: 60 });
  });

  it("leaves the disk cache to Next elsewhere", () => {
    expect(onPlatform("linux", () => AOFCreateNextConfig()).images).toEqual({});
  });
});
