// @module-tag unit
// @vitest-environment node
// Node, not jsdom: t3-env only validates server variables where `window` is
// undefined, which is where the Back Office's server runs.

import { readFileSync } from "node:fs";
import { API } from "@allonfire/api/shared/constants/api";
import { LOCAL } from "@allonfire/config/local/addresses";
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
  "API_URL",
  "BACK_OFFICE_URL",
  "NEXT_PUBLIC_API_URL",
  "STORAGE_ENDPOINT",
] as const;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("STORAGE_ENDPOINT", undefined);
  vi.stubEnv("AUTH_APP", App.BACK_OFFICE);
  vi.stubEnv("API_AUTH_URL", `${LOCAL.URL.API}${API.PATH.AUTH}`);
  vi.stubEnv("NEXT_PUBLIC_API_URL", LOCAL.URL.API);
  vi.stubEnv("BACK_OFFICE_URL", LOCAL.URL.BACK_OFFICE);
  vi.stubEnv("API_URL", LOCAL.URL.API);
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

  it.each([
    ["without the API's server address", undefined],
    ["with an API address that is not a URL", "not-a-url"],
  ])("refuses to start %s", async (_, value) => {
    vi.stubEnv("API_URL", value);
    await expect(import("../environment")).rejects.toThrow(
      "Invalid environment variables"
    );
  });

  it("lets Turbo hand the build every variable it validates", () => {
    // The App's zod parses: a schema crosses no package (CLAUDE.md).
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

  it("points .env.example at the API's own Auth path", () => {
    const example = readFileSync(
      new URL("../../../.env.example", import.meta.url),
      "utf8"
    );
    expect(example).toContain(
      `API_AUTH_URL="${LOCAL.URL.API}${API.PATH.AUTH}"`
    );
  });
});
