// @module-tag unit
// @vitest-environment node
// Node, not jsdom: t3-env only validates server variables where `window` is
// undefined, which is where the Back office's server runs.

import { API_PATH, LOCAL } from "@allonfire/config/local/addresses";
import { App } from "@allonfire/database/enums";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("STORAGE_ENDPOINT", undefined);
  vi.stubEnv("AUTH_APP", App.BACK_OFFICE);
  vi.stubEnv("API_AUTH_URL", `${LOCAL.URL.API}${API_PATH.AUTH}`);
  vi.stubEnv("NEXT_PUBLIC_API_URL", LOCAL.URL.API);
});

describe("environment", () => {
  it("loads at runtime without STORAGE_ENDPOINT, which only the build reads", async () => {
    await expect(import("../environment")).resolves.toHaveProperty("env");
  });

  it("refuses a build without STORAGE_ENDPOINT", async () => {
    await expect(import("../build-environment")).rejects.toThrow(
      "Invalid environment variables"
    );
  });
});
