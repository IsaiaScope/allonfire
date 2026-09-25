import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
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
