// Relative, not `@allonfire/config`: a root dependency on a workspace
// package feeds turbo's global hash, so any file in it (a README) would
// invalidate every cached task in the repo.

import { defineConfig, mergeConfig } from "vitest/config";
import { vitestConfig } from "./packages/config/tests/vitest.config";

/**
 * Every package in one run, for `pnpm test:ui` and a single merged
 * `pnpm test:coverage` report. `pnpm test` still goes through turbo, one
 * cached run per package.
 */
export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      // Coverage is decided here, not per project.
      // `.ts` only: a `.tsx` no test loads reaches the v8 remapper untransformed
      // and fails to parse. Add `tsx` once a React component has a test.
      coverage: { include: ["{apps,packages}/*/src/**/*.ts"] },
      projects: ["{apps,packages}/*/vitest.config.ts"],
    },
  })
);
