// @module-tag unit

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "../repo";

const read = (path: string) => readFileSync(resolve(REPO.ROOT, path), "utf8");

// ponytail: line checks over the text, no JSONC parser: config imports
// nothing, core's helpers included.
const KNIP_CONFIG = "knip.jsonc";
const WORKSPACE_FILE = "pnpm-workspace.yaml";

/** A key that opens a knip ignore list or map (`ignore`, `ignoreIssues`, …). */
const IGNORE_KEY = /^\s*"ignore\w*":\s*([[{])/;
const COMMENT = /^\s*\/\//;
const STRING = /"(?:[^"\\]|\\.)*"/g;
const FIRST_STRING = /"((?:[^"\\]|\\.)*)"/;
/** A glob whose last segments are only `*` or `**`: a whole folder. */
const WHOLE_FOLDER = /(?:^|\/)\*\*?(?:\/\*\*?)*$/;
/** A folder pnpm leaves out of the workspace (`- "!apps/laura"`). */
const OUTSIDE_WORKSPACE = /^\s*-\s*"!([^"]+)"/gm;
const SIDECAR = /(?:^|\/)\._/;
/**
 * A reason that says only tests read the export: such an export takes
 * `/** @internal *\/`, never a file-wide accept.
 */
const TESTS_ONLY =
  /\b(?:exported|kept) only for (?:its |their )?tests?\b|\bonly tests (?:read|import)/i;

/** How far a line moves the bracket depth, strings left out. */
const depthChange = (line: string) => {
  const bare = line.replace(STRING, '""');
  const opened = bare.split("").filter((char) => char === "[" || char === "{");
  const closed = bare.split("").filter((char) => char === "]" || char === "}");
  return opened.length - closed.length;
};

type IgnoreEntry = {
  pattern: string;
  /** The `//` lines right above it, or above the run of entries it joins. */
  reason: string;
};

/** Every entry of every ignore list or map, at any depth, with its reason. */
const ignoreEntries = (text: string) => {
  const lines = text.split("\n");
  const entries: IgnoreEntry[] = [];
  let index = 0;
  while (index < lines.length) {
    const opening = lines[index] ?? "";
    index += 1;
    if (!IGNORE_KEY.test(opening)) {
      continue;
    }
    const inline = opening.replace(IGNORE_KEY, "").match(FIRST_STRING)?.[1];
    if (inline !== undefined) {
      entries.push({ pattern: inline, reason: "" });
    }
    let depth = depthChange(opening);
    let reason = "";
    let afterComment = false;
    while (depth > 0 && index < lines.length) {
      const line = lines[index] ?? "";
      index += 1;
      if (COMMENT.test(line)) {
        reason = afterComment ? `${reason} ${line.trim()}` : line.trim();
        afterComment = true;
        continue;
      }
      afterComment = false;
      // A line deeper than the list's own (a multi-line value) is part of
      // the entry above it.
      if (depth === 1) {
        const pattern = line.match(FIRST_STRING)?.[1];
        if (pattern !== undefined) {
          entries.push({ pattern, reason });
        } else if (line.trim() !== "") {
          reason = "";
        }
      }
      depth += depthChange(line);
    }
  }
  return entries;
};

/** Every source file of a workspace App or package, tracked or new. */
const workspaceSources = () => {
  const outside = [...read(WORKSPACE_FILE).matchAll(OUTSIDE_WORKSPACE)]
    .flatMap((match) => match[1] ?? [])
    .map((dir) => `${dir}/`);
  return execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      "apps/*/src/*",
      "packages/*/src/*",
    ],
    { cwd: REPO.ROOT, encoding: "utf8" }
  )
    .split("\n")
    .filter(
      (path) =>
        path !== "" &&
        !SIDECAR.test(path) &&
        !outside.some((dir) => path.startsWith(dir)) &&
        existsSync(resolve(REPO.ROOT, path))
    );
};

it("every knip ignore carries a reason, and none covers a whole folder", () => {
  const entries = ignoreEntries(read(KNIP_CONFIG));
  expect(entries.length).toBeGreaterThan(0);
  expect(
    entries.filter(({ reason }) => reason === "").map(({ pattern }) => pattern)
  ).toEqual([]);
  expect(
    entries
      .filter(({ pattern }) => WHOLE_FOLDER.test(pattern))
      .map(({ pattern }) => pattern)
  ).toEqual([]);
});

it("accepts no export file-wide because only tests read it", () => {
  expect(
    ignoreEntries(read(KNIP_CONFIG))
      .filter(({ reason }) => TESTS_ONLY.test(reason))
      .map(({ pattern }) => pattern)
  ).toEqual([]);
});

it("no workspace source carries a biome-ignore", () => {
  expect(
    workspaceSources().filter((path) => read(path).includes("biome-ignore"))
  ).toEqual([]);
});
