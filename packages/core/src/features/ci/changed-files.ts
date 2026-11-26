import { execFileSync } from "node:child_process";

/**
 * The files the checkout at `root` changed since `base`, from the repo root;
 * every file it tracks when there is no base. The deploy and a Release both
 * list them here. `--no-renames` lists a moved file under both paths, so the
 * folder it left counts; `-z` keeps every name as it is (git quotes one with
 * an accent).
 */
export const changedFiles = (root: string, base: string): string[] =>
  execFileSync(
    "git",
    base
      ? ["diff", "--name-only", "--no-renames", "-z", `${base}...HEAD`]
      : ["ls-files", "-z"],
    { cwd: root, encoding: "utf8" }
  )
    .split("\0")
    .filter(Boolean);
