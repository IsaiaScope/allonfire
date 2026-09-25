import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      include: ["src/**/*.test.ts"],
      setupFiles: ["./vitest.setup.ts"],
    },
  })
);
