import { defineConfig } from "@playwright/test";

const isCi = Boolean(process.env.CI);

/**
 * Shared by every app with end-to-end tests. An app passes its own options as
 * the second argument: `defineConfig(playwrightConfig, { use: { baseURL } })`.
 */
export const playwrightConfig = defineConfig({
  forbidOnly: isCi,
  fullyParallel: true,
  reporter: isCi ? "github" : "list",
  retries: isCi ? 2 : 0,
  testDir: "./e2e",
  use: { trace: "on-first-retry" },
});
