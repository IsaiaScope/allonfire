import { resolve } from "node:path";

/** The label of an e2e run's Test database and bucket, beside its stamp. */
export const E2E_LABEL = "e2e";

const PACKAGES = resolve(import.meta.dirname, "../../..");

/**
 * The CLI that makes, names and drops each thing an e2e run owns: the folder
 * of the package holding it, and its script there.
 */
export const E2E_CLI = {
  BUCKET: { dir: resolve(PACKAGES, "storage"), script: "test-bucket" },
  DATABASE: { dir: resolve(PACKAGES, "database"), script: "test-database" },
} as const;
