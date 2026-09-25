import { playwrightConfig } from "@allonfire/config/tests/playwright";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig(playwrightConfig, {
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 15"] } },
  ],
  use: { baseURL },
  // Reuses `pnpm dev` when it is already up; CI starts its own.
  webServer: {
    command: "pnpm dev",
    reuseExistingServer: !process.env.CI,
    url: baseURL,
  },
});
