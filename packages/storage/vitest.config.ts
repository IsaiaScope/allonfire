import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      setupFiles: ["./vitest.setup.ts"],
      // sharp encodes real images (4000px at most): ~1s alone, but several
      // seconds when `turbo run test` runs every package at once.
      testTimeout: 20_000,
    },
  })
);
