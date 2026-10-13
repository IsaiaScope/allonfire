import { vitestConfig } from "@allonfire/config/tests/vitest";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      // A bucket per run holding the Image Fixtures, dropped after.
      globalSetup: ["./src/features/test-bucket/global-setup.ts"],
      setupFiles: ["./vitest.setup.ts"],
      // sharp encodes real images (4000px at most): ~1s alone, but several
      // seconds when `turbo run test` runs every package at once.
      testTimeout: 20 * UNIT.MS_PER_SECOND,
    },
  })
);
