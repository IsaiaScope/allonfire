// @module-tag integration
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { gitIn, initRepo, writeIn } from "./git-repo";

const HOOK = {
  /** What Finder leaves in a folder it opened; git ignores it. */
  FINDER: "packages/core/src/features/ci/.DS_Store",
  PATH: ".iso/release-hook",
  /** A stand-in `pnpm`: says what it was asked, and does nothing. */
  PNPM: '#!/usr/bin/env bash\necho "pnpm $*"\n',
  RULES: "packages/core/src/features/ci/rules.ts",
  /** Code the rules import from outside their own folder. */
  SHARED: "packages/core/src/shared/constants/patterns.ts",
  TEST: "packages/core/src/features/ci/tests/rules.test.ts",
} as const;

let lab = "";
let main = "";
let release = "";

const git = (...args: string[]) => gitIn(main, ...args);

/** The hook as `/iso-push` runs it: in the release worktree. */
const runHook = () =>
  spawnSync(join(release, HOOK.PATH), ["0.13.0", "0.14.0", "abc123"], {
    cwd: release,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${join(lab, "bin")}${delimiter}${process.env.PATH}`,
    },
  });

beforeEach(() => {
  lab = mkdtempSync(join(tmpdir(), "release-hook-"));
  main = join(lab, "main");
  release = join(lab, "release");
  writeIn(lab, "bin/pnpm", HOOK.PNPM);
  chmodSync(join(lab, "bin/pnpm"), 0o755);
  mkdirSync(join(main, dirname(HOOK.PATH)), { recursive: true });
  copyFileSync(join(REPO.ROOT, HOOK.PATH), join(main, HOOK.PATH));
  chmodSync(join(main, HOOK.PATH), 0o755);
  writeIn(main, HOOK.RULES, "export const rule = 1;\n");
  writeIn(main, HOOK.TEST, "export const test = 1;\n");
  writeIn(main, HOOK.SHARED, "export const pattern = 1;\n");
  initRepo(main);
  git("add", "-A");
  git("commit", "-q", "--no-verify", "-m", "base");
  git("worktree", "add", "-q", "--detach", release);
});

afterEach(() => {
  rmSync(lab, { force: true, recursive: true });
});

describe("the release hook", () => {
  it("runs the main checkout's script against the release worktree", () => {
    const { status, stdout } = runHook();

    expect(status).toBe(0);
    expect(stdout).toContain("ci:release-versions");
    expect(stdout).toContain("--previous 0.13.0 --next 0.14.0 --from abc123");
  });

  // It runs the main checkout's code: behind the base, its old rules would
  // number the Release without a word.
  it("stops, naming why, when that checkout's rules are not the release's", () => {
    writeIn(main, HOOK.RULES, "export const rule = 2;\n");

    const { status, stdout, stderr } = runHook();

    expect(status).not.toBe(0);
    expect(stdout).not.toContain("ci:release-versions");
    expect(stderr).toContain("rules.ts");
  });

  it("stops when the shared code those rules import differs", () => {
    writeIn(main, HOOK.SHARED, "export const pattern = 2;\n");

    const { status, stderr } = runHook();

    expect(status).not.toBe(0);
    expect(stderr).toContain("patterns.ts");
  });

  it("does not stop for a file the Finder left", () => {
    writeIn(main, HOOK.FINDER, "finder\n");

    expect(runHook().status).toBe(0);
  });

  it("does not stop for a test file that differs", () => {
    writeIn(main, HOOK.TEST, "export const test = 2;\n");

    expect(runHook().status).toBe(0);
  });
});
