// @module-tag unit
import { PHASE_PRODUCTION_BUILD } from "next/constants";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("AUTH_APP", undefined);
  vi.stubEnv("API_URL", undefined);
  vi.stubEnv("API_AUTH_URL", undefined);
});

describe("nextAuthEnv", () => {
  it("refuses to run without the App's auth variables", async () => {
    await expect(import("../next-environment")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("lets `next build` collect page data without them", async () => {
    vi.stubEnv("NEXT_PHASE", PHASE_PRODUCTION_BUILD);
    await expect(import("../next-environment")).resolves.toHaveProperty(
      "nextAuthEnv"
    );
  });
});
