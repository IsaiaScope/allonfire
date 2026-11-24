// @module-tag unit
// @vitest-environment node
import { proxyConfig } from "./proxy-config";

describe("proxyConfig", () => {
  it("loads a proxy with its Session refresh, gate and locale middleware passed through", async () => {
    const config = await proxyConfig(() => import("./proxy-config-fixture"));
    expect(config.matcher).toBe("/fixture");
    const { handler, wrapped } = await import("./proxy-config-fixture");
    expect(wrapped).toBe(handler);
  });
});
