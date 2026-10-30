import { TEST_API_URL } from "@allonfire/config/local/addresses";
import { vitestBrowserConfig } from "@allonfire/config/tests/browser";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { defineConfig, mergeConfig } from "vitest/config";
import { appViteOptions } from "./vitest.config";

// The App's env module reads process.env, which only Node has: the browser
// gets the one public var.
export default mergeConfig(
  mergeConfig(vitestBrowserConfig, appViteOptions),
  defineConfig({
    define: {
      "process.env": stringifyJson({ NEXT_PUBLIC_API_URL: TEST_API_URL }),
    },
    test: { setupFiles: ["./vitest.browser.setup.ts"] },
  })
);
