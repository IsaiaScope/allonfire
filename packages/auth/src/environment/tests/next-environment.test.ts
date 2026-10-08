// @module-tag unit
import { AllowedApp, Role } from "@allonfire/database/enums";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("AUTH_APP", undefined);
  vi.stubEnv("AUTH_MIN_ROLE", undefined);
  vi.stubEnv("API_URL", undefined);
  vi.stubEnv("API_AUTH_URL", undefined);
});

describe("nextAuthEnv", () => {
  it("refuses to run without the App's auth variables", async () => {
    await expect(import("../next-environment")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("refuses an App that does not say which Role it lets in", async () => {
    vi.stubEnv("AUTH_APP", AllowedApp.BACK_OFFICE);
    vi.stubEnv("API_AUTH_URL", "http://api.test/v1/auth");
    vi.stubEnv("API_URL", "http://api.test");
    await expect(import("../next-environment")).rejects.toThrow(
      "Invalid environment variables"
    );
    vi.stubEnv("AUTH_MIN_ROLE", Role.ADMIN);
    vi.resetModules();
    await expect(import("../next-environment")).resolves.toHaveProperty(
      "nextAuthEnv.AUTH_MIN_ROLE",
      Role.ADMIN
    );
  });

  it("lets `next build` collect page data without them", async () => {
    vi.stubEnv("NEXT_PHASE", PHASE_PRODUCTION_BUILD);
    await expect(import("../next-environment")).resolves.toHaveProperty(
      "nextAuthEnv"
    );
  });
});
