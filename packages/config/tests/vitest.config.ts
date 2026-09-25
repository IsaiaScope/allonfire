import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

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
    // LOG_LEVEL instead.
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
