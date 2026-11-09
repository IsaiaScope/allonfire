import { vitestBrowserConfig } from "@allonfire/config/tests/browser";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { defineConfig, mergeConfig } from "vitest/config";

// ui fakes no API, so no MSW: each component renders alone, under the
// stylesheet the setup file loads. next/image (AOFImage) reads process.env,
// which only Node has: the browser gets none of it.
export default mergeConfig(
  vitestBrowserConfig,
  defineConfig({
    define: { "process.env": stringifyJson({}) },
    test: { setupFiles: ["./vitest.browser.setup.ts"] },
  })
);
