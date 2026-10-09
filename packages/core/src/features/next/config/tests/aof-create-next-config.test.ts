// @module-tag unit
import { SECURITY_HEADERS } from "../../../http/constants/security-headers";
import { AOFCreateNextConfig } from "../aof-create-next-config";

vi.mock("next-intl/plugin", () => ({
  default: (requestConfig: string) => (config: object) => ({
    ...config,
    env: { INTL_REQUEST_CONFIG: requestConfig },
  }),
}));

const APP_HEADER = { key: "X-Frame-Options", value: "SAMEORIGIN" };

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
      { headers: SECURITY_HEADERS, source: "/(.*)" },
      { headers: [APP_HEADER], source: "/embed" },
    ]);
  });

  it("adds next-intl's plugin only when asked", () => {
    expect(AOFCreateNextConfig().env).toBeUndefined();
    expect(
      AOFCreateNextConfig({}, { intl: { requestConfig: "./request.ts" } }).env
    ).toEqual({ INTL_REQUEST_CONFIG: "./request.ts" });
  });
});
