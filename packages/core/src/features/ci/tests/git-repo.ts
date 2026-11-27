import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** `git` in the throwaway repo at `root`; its output, trimmed. */
export const gitIn = (root: string, ...args: string[]): string =>
  execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();

/** A new repo at `root`, with an author of its own. */
export const initRepo = (root: string): void => {
  gitIn(root, "init", "-q", "-b", "main");
  gitIn(root, "config", "user.email", "test@example.com");
  gitIn(root, "config", "user.name", "Test");
};

/** Writes a file under `root`, making its folders. */
export const writeIn = (root: string, path: string, content: string): void => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
};
