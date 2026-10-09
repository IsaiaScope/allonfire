import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig } from "vitest/config";

// The sync script's tests and the Design components' render tests both match
// the shared defaults.
export default defineConfig(vitestConfig);
