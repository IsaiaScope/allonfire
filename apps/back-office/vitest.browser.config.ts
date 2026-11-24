import { aofAppBrowserVitest } from "@allonfire/config/tests/vitest/app";
import { appViteOptions } from "./vitest.config";

export default aofAppBrowserVitest({
  appViteOptions,
  setupFile: "./vitest.browser.setup.ts",
});
