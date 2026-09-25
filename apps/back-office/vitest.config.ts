import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig } from "vitest/config";

// No app-specific options yet; add them with mergeConfig as in apps/api.
export default defineConfig(vitestConfig);
