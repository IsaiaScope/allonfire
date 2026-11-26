// @module-tag unit
import { LOCAL } from "../../../local/addresses";
import { aofAppBrowserVitest, aofAppVitest } from "../app-vitest";
import { VITEST } from "../vitest.config";

const SRC = "/x/src";
const SETUP_FILE = "./vitest.browser.setup.ts";

describe("aofAppVitest", () => {
  it("aliases @ to the App's src, as its tsconfig does", () => {
    expect(aofAppVitest(SRC).appViteOptions).toMatchObject({
      resolve: { alias: { "@": SRC } },
    });
  });

  it("compiles JSX with the automatic runtime", () => {
    expect(aofAppVitest(SRC).appViteOptions).toMatchObject({
      oxc: { jsx: { runtime: "automatic" } },
    });
  });

  it("has vite process next-intl instead of Node", () => {
    expect(aofAppVitest(SRC).vitestConfig.test?.server?.deps?.inline).toEqual(
      expect.arrayContaining(["next-intl"])
    );
  });

  it("keeps the shared preset's globals and tags", () => {
    expect(aofAppVitest(SRC).vitestConfig.test).toMatchObject({
      globals: true,
    });
  });
});

describe("aofAppBrowserVitest", () => {
  const { appViteOptions } = aofAppVitest(SRC);
  const config = aofAppBrowserVitest({
    appViteOptions,
    setupFile: SETUP_FILE,
  });

  it("hands the browser the one public address its env module reads", () => {
    expect(config.define?.["process.env"]).toContain(LOCAL.URL.TEST_API);
  });

  it("runs the App's own setup file", () => {
    expect(config.test?.setupFiles).toEqual(
      expect.arrayContaining([SETUP_FILE])
    );
  });

  it("keeps the App's alias", () => {
    expect(config).toMatchObject({ resolve: { alias: { "@": SRC } } });
  });

  it("runs in a browser", () => {
    expect(config.test?.browser).toMatchObject({ enabled: true });
  });

  // Unset, Vitest opens cores minus one tabs per browser: on a 10-core Mac the
  // two browsers' tabs crowd each other out and tests pass their time limit.
  it("limits how many tabs each browser runs at once", () => {
    expect(config.test?.maxWorkers).toBe(VITEST.BROWSER_MAX_WORKERS);
    expect(VITEST.BROWSER_MAX_WORKERS).toBe(3);
  });
});
