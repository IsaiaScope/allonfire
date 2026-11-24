import { LOCAL } from "@allonfire/config/local/addresses";
import { vitestBrowserConfig } from "@allonfire/config/tests/browser";
import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig, type ViteUserConfig } from "vitest/config";

/**
 * A Next App's Vitest configs over the shared presets (imported by package
 * name: Node loads a config file as it is, where a relative import needs its
 * extension). `@/` mirrors the
 * tsconfig path alias, so components under test import as the App does.
 * Next's tsconfig keeps JSX as written (`preserve`) for its own compiler, so
 * vitest is told to compile it. next-intl imports `next/navigation` without an
 * extension, which only a bundler resolves, so vite processes it instead of
 * Node. `appViteOptions` is returned apart for the browser config, which wears
 * the same alias and JSX settings.
 */
export const aofAppVitest = (srcDir: string) => {
  const appViteOptions = defineConfig({
    oxc: { jsx: { runtime: "automatic" } },
    resolve: { alias: { "@": srcDir } },
  });
  return {
    appViteOptions,
    vitestConfig: mergeConfig(
      mergeConfig(vitestConfig, appViteOptions),
      defineConfig({ test: { server: { deps: { inline: ["next-intl"] } } } })
    ),
  };
};

/**
 * The App's browser tests: the browser preset plus the App's options and its
 * setup file (its stylesheet and MSW). The App's env module reads
 * `process.env`, which only Node has: the browser gets the one public var.
 * Config imports nothing, core's JSON helper included, so the value is written
 * as the JSON text it is.
 */
export const aofAppBrowserVitest = ({
  appViteOptions,
  setupFile,
}: {
  appViteOptions: ViteUserConfig;
  setupFile: string;
}) =>
  mergeConfig(
    mergeConfig(vitestBrowserConfig, appViteOptions),
    defineConfig({
      define: {
        "process.env": `{"NEXT_PUBLIC_API_URL":"${LOCAL.URL.TEST_API}"}`,
      },
      test: { setupFiles: [setupFile] },
    })
  );
