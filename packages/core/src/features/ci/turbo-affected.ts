import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { z } from "zod";
import { parseJsonWith } from "../../shared/utils/json";
import { type Affected, affectedFrom, everything } from "./affected";
import { changedFiles } from "./changed-files";
import { RELEASE } from "./constants/release";

const TURBO = {
  /** This checkout's Turbo: the one it asks about has no install of its own. */
  BIN: "node_modules/.bin/turbo",
  // A raw query, not `turbo ls --output=json`: that flag is experimental.
  PACKAGES_QUERY: "query { packages { items { name path } } }",
} as const;

const manifestSchema = z.object({ packageManager: z.string().optional() });

/**
 * What changed in the checkout at `root` since `base`, as Turbo reads it. No
 * base, or one that does not resolve, is every unit. The deploy and a Release
 * both ask here, so a unit's version moves exactly when it redeploys.
 */
export const affectedSince = (root: string, base: string): Affected => {
  const run = (command: string, args: string[]) =>
    // From the checkout's root: run from a package's folder, Turbo scopes to it.
    execFileSync(command, args, { cwd: root, encoding: "utf8" });
  const turbo = (...args: string[]) => run(join(REPO.ROOT, TURBO.BIN), args);
  const resolves = (ref: string) => {
    try {
      run("git", ["rev-parse", "--quiet", "--verify", `${ref}^{commit}`]);
      return true;
    } catch {
      return false;
    }
  };

  // Every image installs with this pnpm. Turbo lists no package for it, and a
  // Release edits the same file, so only the field itself tells.
  const pnpmAt = (ref: string) =>
    parseJsonWith(
      run("git", ["show", `${ref}:${RELEASE.FILE.MANIFEST}`]),
      manifestSchema
    ).packageManager;

  const all = turbo("query", TURBO.PACKAGES_QUERY);
  if (!(base && resolves(base)) || pnpmAt(base) !== pnpmAt("HEAD")) {
    return everything(all);
  }
  return affectedFrom(
    turbo("query", "affected", "--packages", `--base=${base}`, "--head=HEAD"),
    all,
    changedFiles(root, base)
  );
};
