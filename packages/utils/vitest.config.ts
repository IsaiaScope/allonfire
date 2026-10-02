import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      // next-intl imports `next/navigation` without an extension, which only a
      // bundler resolves: let Vite process it instead of Node.
      server: { deps: { inline: ["next-intl"] } },
    },
  })
);
