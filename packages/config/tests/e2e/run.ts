import { resolve } from "node:path";

const PACKAGES = resolve(import.meta.dirname, "../../..");

/** An e2e run's own values: what it names, what it runs and the tags its tests take. */
export const E2E = {
  /**
   * The CLI that makes, names and drops each thing an e2e run owns: the
   * folder of the package holding it, and its script there.
   */
  CLI: {
    BUCKET: { dir: resolve(PACKAGES, "storage"), script: "test-bucket" },
    DATABASE: { dir: resolve(PACKAGES, "database"), script: "test-database" },
  },
  /** The label of an e2e run's Test database and bucket, beside its stamp. */
  LABEL: "e2e",
  /**
   * Tags an e2e test takes (`test(name, { tag }, ...)`). `CHROMIUM_ONLY`: the
   * WebKit projects leave it out, for what Playwright drives in Chromium only
   * (a page under a service worker, reloaded offline).
   */
  TAG: {
    CHROMIUM_ONLY: "@chromium-only",
  },
} as const;
