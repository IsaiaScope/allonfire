import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      // A Test database per run, dropped after (CONTEXT.md).
      globalSetup: ["@allonfire/database/features/test-database/global-setup"],
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["./vitest.setup.ts"],
    },
  })
);
