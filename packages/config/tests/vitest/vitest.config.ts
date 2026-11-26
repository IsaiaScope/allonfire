import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

/** The Vitest preset's own values. */
export const VITEST = {
  /** Browser tests, which only `vitestBrowserConfig` collects. */
  BROWSER_FILES: "**/*.browser.test.{ts,tsx}",
  /**
   * How many test files each browser runs at once, in its own tab each.
   * Vitest's own default is cores minus one: 9 per browser on a 10-core Mac,
   * where the tabs of both crowd each other out and tests pass their time
   * limit; 3 is that default on a 4-core machine.
   */
  BROWSER_MAX_WORKERS: 3,
  /**
   * How long a browser test waits for the page. Vitest's own default is one
   * second: on a 4-core CI runner a table has taken over 3 seconds to appear.
   * A passing wait ends as soon as the page answers; only a failing one lasts
   * this long.
   */
  BROWSER_WAIT_MS: 10_000,
} as const;

/**
 * Shared by every package that runs vitest. A package merges its own options
 * on top: `mergeConfig(vitestConfig, defineConfig({ test: { ... } }))`.
 */
export const vitestConfig = defineConfig({
  test: {
    // Only `pnpm test:coverage` (`--coverage`) turns it on.
    coverage: {
      include: ["src/**/*.ts"],
      reporter: ["text-summary", "html", "lcov"],
    },
    exclude: [
      ...configDefaults.exclude,
      // macOS writes `._name` AppleDouble twins on non-APFS volumes, and
      // vitest would collect `._app.test.ts` as a test file.
      "**/._*",
      // Playwright owns these.
      "e2e/**",
      // The browser config runs these (../browser/vitest.browser.config.ts).
      VITEST.BROWSER_FILES,
    ],
    // `describe`, `it`, `expect`, `vi` without an import. The package's
    // tsconfig lists `vitest/globals` so the types follow.
    globals: true,
    // A package with no tests yet still passes `pnpm test`.
    passWithNoTests: true,
    // Every `vi.spyOn`, `vi.stubEnv` and `vi.stubGlobal` is undone before the
    // next test, so no test cleans up after itself by hand.
    restoreMocks: true,
    // Runs before the package's own setup file: mergeConfig concatenates.
    setupFiles: [fileURLToPath(new URL("./vitest.setup.ts", import.meta.url))],
    // Console output from passing tests is noise: many assert on failure
    // paths that log on purpose. A failing test still prints its console
    // output; pino writes to stdout directly, so apps/api silences it with
    // API_LOG_LEVEL instead.
    silent: "passed-only",
    // Every file starts with `// @module-tag unit` or `// @module-tag
    // integration`; vitest.setup.ts fails a test that has neither.
    // `pnpm test:unit` runs with no Docker up.
    tags: [
      {
        description: "Needs nothing running: passes on a fresh checkout.",
        name: "unit",
      },
      {
        description:
          "Needs a running service: a database, a cache, a queue, an external API.",
        name: "integration",
        timeout: 30_000,
      },
    ],
    // Type tests (`*.test-d.ts`) collect files on their own list, so the
    // AppleDouble twins need excluding there too.
    typecheck: { exclude: [...configDefaults.typecheck.exclude, "**/._*"] },
    unstubEnvs: true,
    unstubGlobals: true,
  },
});
