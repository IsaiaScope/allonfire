import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      // A Test database and a bucket per run, dropped after (CONTEXT.md).
      globalSetup: [
        "@allonfire/database/features/test-database/global-setup",
        "@allonfire/storage/features/test-bucket/global-setup",
      ],
      include: ["src/**/*.test.ts"],
      setupFiles: ["./vitest.setup.ts"],
      typecheck: {
        enabled: true,
        include: ["src/**/*.test-d.ts"],
        tsconfig: "./tsconfig.json",
      },
    },
  })
);
