import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig } from "vitest/config";

// The sync script's tests and the Designs' constant tests both match
// the shared defaults.
export default defineConfig(vitestConfig);
