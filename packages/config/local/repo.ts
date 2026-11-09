import { resolve } from "node:path";

/** The repository's root: config sits at `packages/config`, two levels down. */
const ROOT = resolve(import.meta.dirname, "../../..");

/**
 * The repository's folders, resolved once from config's own place. A script or
 * test that reads a file outside its own package starts here, never from `..`
 * counted from `import.meta`.
 */
export const REPO = {
  APPS: resolve(ROOT, "apps"),
  PACKAGES: resolve(ROOT, "packages"),
  ROOT,
} as const;
