import { BROWSER_TESTS, vitestConfig } from "@allonfire/config/tests/vitest";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// `mergeConfig` concatenates arrays, so merging would keep the Node config's
// exclusion of browser tests: the Node options are spread instead.
const { exclude = [], ...nodeTest } = vitestConfig.test ?? {};

/**
 * Browser tests (`*.browser.test.ts(x)`): one component in a real Chromium
 * and a real WebKit (Safari's engine), driven by Playwright. No Next server runs here: Server Components, server
 * actions and navigation are the e2e tests' job. A package merges its own
 * options on top, as with `vitestConfig`.
 */
export const vitestBrowserConfig = defineConfig({
  ...vitestConfig,
  test: {
    ...nodeTest,
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }, { browser: "webkit" }],
      provider: playwright(),
      screenshotFailures: false,
    },
    exclude: exclude.filter((pattern) => pattern !== BROWSER_TESTS),
    include: [`src/${BROWSER_TESTS}`],
  },
});
