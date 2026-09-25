import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      fileParallelism: false,
      hookTimeout: 30_000,
      setupFiles: ["./vitest.setup.ts"],
    },
  })
);
