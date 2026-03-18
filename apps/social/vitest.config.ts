import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@/": `${resolve(import.meta.dirname, "src")}/` },
  },
  test: {
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
    setupFiles: ["./vitest.setup.ts"],
  },
});
