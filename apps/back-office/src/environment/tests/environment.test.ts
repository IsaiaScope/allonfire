// @module-tag unit
// @vitest-environment node
// Node, not jsdom: t3-env only validates server variables where `window` is
// undefined, which is where the Back Office's server runs.

import { readFileSync } from "node:fs";
import { API_PATH, LOCAL } from "@allonfire/config/local/addresses";
import { parseJson } from "@allonfire/core/shared/utils/json";
import { App } from "@allonfire/database/enums";
import { z } from "zod";

/** What CI and the Docker image build with, in Turbo's strict env mode. */
const TURBO_JSON = new URL("../../../../../turbo.json", import.meta.url);
const turboSchema = z.object({
  globalPassThroughEnv: z.array(z.string()).default([]),
  tasks: z.object({ build: z.object({ env: z.array(z.string()) }) }),
});
/** Every variable `next build` validates: Turbo drops any it does not list. */
const BUILD_VARIABLES = [
  "BACK_OFFICE_URL",
  "NEXT_PUBLIC_API_URL",
  "STORAGE_ENDPOINT",
] as const;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("STORAGE_ENDPOINT", undefined);
  vi.stubEnv("AUTH_APP", App.BACK_OFFICE);
  vi.stubEnv("API_AUTH_URL", `${LOCAL.URL.API}${API_PATH.AUTH}`);
  vi.stubEnv("NEXT_PUBLIC_API_URL", LOCAL.URL.API);
  vi.stubEnv("BACK_OFFICE_URL", LOCAL.URL.BACK_OFFICE);
});

describe("environment", () => {
  it("loads at runtime without STORAGE_ENDPOINT, which only the build reads", async () => {
    await expect(import("../environment")).resolves.toHaveProperty("env");
  });

  it("refuses to start without the Back Office's own address", async () => {
    vi.stubEnv("BACK_OFFICE_URL", undefined);
    await expect(import("../environment")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("refuses an address that is not a URL", async () => {
    vi.stubEnv("BACK_OFFICE_URL", "not-a-url");
    await expect(import("../environment")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("lets Turbo hand the build every variable it validates", () => {
    const turbo = turboSchema.parse(
      parseJson(readFileSync(TURBO_JSON, "utf8"))
    );
    const passed = [...turbo.tasks.build.env, ...turbo.globalPassThroughEnv];
    expect(passed).toEqual(expect.arrayContaining([...BUILD_VARIABLES]));
  });

  it("refuses a build without STORAGE_ENDPOINT", async () => {
    await expect(import("../build-environment")).rejects.toThrow(
      "Invalid environment variables"
    );
  });
});
