import { resolve } from "node:path";
import { REPO } from "../../local/repo";

/** An e2e run's own values: what it names, what it runs and the tags its tests take. */
export const E2E = {
  /**
   * The CLI that makes, names and drops each thing an e2e run owns: the
   * folder of the package holding it, and its script there.
   */
  CLI: {
    BUCKET: { dir: resolve(REPO.PACKAGES, "storage"), script: "test-bucket" },
    DATABASE: {
      dir: resolve(REPO.PACKAGES, "database"),
      script: "test-database",
    },
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

/**
 * The arguments of one e2e CLI call after `pnpm`: `-s -C <dir> <script>
 * <command> e2e <stamp>`. `-C`, not `--filter`: a filtered run prints a
 * banner into the captured name.
 */
export const e2eCliArgs = (
  { dir, script }: { dir: string; script: string },
  command: string,
  stamp: string
): string[] => ["-s", "-C", dir, script, command, E2E.LABEL, stamp];
