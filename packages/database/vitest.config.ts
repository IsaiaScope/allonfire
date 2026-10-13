import { vitestConfig } from "@allonfire/config/tests/vitest";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      fileParallelism: false,
      // A Test database per run, dropped after (CONTEXT.md).
      globalSetup: ["./src/features/test-database/global-setup.ts"],
      hookTimeout: 30 * UNIT.MS_PER_SECOND,
      setupFiles: ["./vitest.setup.ts"],
    },
  })
);
