import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

// Only the canonicalize script has tests; the components are vendor code.
export default mergeConfig(
  vitestConfig,
  defineConfig({ test: { include: ["scripts/**/*.test.ts"] } })
);
