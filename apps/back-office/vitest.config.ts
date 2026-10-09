import { fileURLToPath } from "node:url";
import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

// `@/` mirrors the tsconfig path alias, so components under test import as
// the App does. Next's tsconfig keeps JSX as written (`preserve`) for its own
// compiler, so vitest is told to compile it. next-intl imports
// `next/navigation` without an extension, which only a bundler resolves, so
// vite processes it instead of Node.
export default mergeConfig(
  vitestConfig,
  defineConfig({
    oxc: { jsx: { runtime: "automatic" } },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: { server: { deps: { inline: ["next-intl"] } } },
  })
);
