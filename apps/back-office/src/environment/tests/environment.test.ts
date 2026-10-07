// @module-tag unit
// @vitest-environment node
// Node, not jsdom: t3-env only validates server variables where `window` is
// undefined, which is where the Back office's server runs.

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("STORAGE_ENDPOINT", undefined);
  vi.stubEnv("AUTH_APP", "BACK_OFFICE");
  vi.stubEnv("API_AUTH_URL", "http://localhost:3300/v1/auth");
  vi.stubEnv("AUTH_MIN_ROLE", "ADMIN");
  vi.stubEnv("API_URL", "http://localhost:3300");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3300");
});

afterEach(() => {
  vi.unstubAllEnvs();
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
