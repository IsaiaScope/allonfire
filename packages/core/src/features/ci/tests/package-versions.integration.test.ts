// @module-tag integration
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { z } from "zod";
import { PATTERN } from "../../../shared/constants/patterns";
import { parseJsonWith } from "../../../shared/utils/json";
import { RELEASE } from "../constants/release";
import { partsOf } from "../release-versions";
import { readWorkspace } from "../release-workspace";

const RELEASE_HOOK = ".iso/release-hook";
/** How `git ls-files --stage` starts an executable file's line. */
const EXECUTABLE_MODE = "100755 ";

const rootVersion = parseJsonWith(
  readFileSync(join(REPO.ROOT, RELEASE.FILE.MANIFEST), "utf8"),
  z.object({ version: z.string() })
).version;

/** Whether `a` is later than `b`, both `major.minor.patch`. */
const isAfter = (a: string, b: string) => {
  const [aMajor, aMinor, aPatch] = partsOf(a);
  const [bMajor, bMinor, bPatch] = partsOf(b);
  if (aMajor !== bMajor) {
    return aMajor > bMajor;
  }
  return aMinor === bMinor ? aPatch > bPatch : aMinor > bMinor;
};

describe("every workspace package's version", () => {
  const packages = readWorkspace(REPO.ROOT);

  it("is three numbers, as a Release writes it", () => {
    expect(
      packages
        .filter(({ version }) => !PATTERN.RELEASE.VERSION.test(version))
        .map(({ name }) => name)
    ).toEqual([]);
  });

  it("is never ahead of the repo's: a Release only moves them up to it", () => {
    expect(
      packages
        .filter(({ version }) => isAfter(version, rootVersion))
        .map(({ name }) => name)
    ).toEqual([]);
  });

  it("lists every App and library the workspace holds", () => {
    expect(packages.length).toBeGreaterThanOrEqual(11);
  });
});

describe("the release hook", () => {
  // `/iso-push` runs it only when it is executable in a fresh worktree, and
  // skips it without a word when it is not. This drive shows every file as
  // executable, so only git's own mode tells.
  it("is executable in git", () => {
    expect(
      execFileSync("git", ["ls-files", "-s", RELEASE_HOOK], {
        cwd: REPO.ROOT,
        encoding: "utf8",
      })
    ).toContain(EXECUTABLE_MODE);
  });
});
