// @module-tag unit
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STAGE, STAGE_NAMES } from "../../stages/stages";
import { REPO } from "../repo";

const read = (path: string) => readFileSync(resolve(REPO.ROOT, path), "utf8");
// ponytail: config cannot import core's parseJson; the scripts block is read
// as text, one `"name": "command"` per line.
const SCRIPT_LINE = /^ {4}"([^"]+)": "((?:[^"\\]|\\.)*)",?$/gm;
const scriptsBlock =
  read("package.json").split('"scripts": {')[1]?.split("\n  }")[0] ?? "";
const SCRIPTS = new Map(
  [...scriptsBlock.matchAll(SCRIPT_LINE)].map(([, name = "", command = ""]) => [
    name,
    command.replaceAll('\\"', '"'),
  ])
);

/** A root script a config names: `pnpm <name>`, `pnpm -s <name>`, `pnpm run <name>`. */
const NAMED = /\bpnpm(?: -s)?(?: run)? ([a-z][\w:-]*)/g;
/** The same in Markdown, only where a code span starts with it: prose says "pnpm from …". */
const NAMED_IN_DOCS = /`pnpm(?: -s)?(?: run)? ([a-z][\w:-]*)/g;
/** A command that waits on a person: a watch, a UI, a headed browser. */
const INTERACTIVE = /--watch|--ui|headed/;
/** pnpm's own commands, and `pnpm turbo`, which runs the binary: none names a script. */
const BUILT_IN = new Set([
  "add",
  "audit",
  "deploy",
  "dlx",
  "exec",
  "install",
  "outdated",
  "remove",
  "turbo",
  "update",
  "why",
]);
/** The files that tell a person or a tool which root script to run. */
const READERS = execFileSync(
  "git",
  [
    "ls-files",
    "--",
    "package.json",
    ".husky",
    ".github",
    "docs/guides",
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "packages/config/README.md",
    ".claude/skills/aof-design",
  ],
  { cwd: REPO.ROOT, encoding: "utf8" }
)
  .split("\n")
  .filter(
    (path) =>
      path !== "" && !path.split("/").some((part) => part.startsWith("._"))
  )
  .filter((path) => !path.startsWith("apps/laura/"));

describe("the root scripts", () => {
  it("run every Stage, and none of the names they replaced", () => {
    for (const name of [...STAGE_NAMES, "check"]) {
      expect(SCRIPTS.get(name)).toBe(
        `tsx packages/config/stages/scripts/stage.ts ${name}`
      );
    }
    for (const old of [
      "lint",
      "check-types",
      "knip",
      "knip:production",
      "dupes",
      "test:browser",
      "test:e2e",
      "i18n:check",
      "tailwind:check",
      "lint:fix",
    ]) {
      expect(SCRIPTS.has(old)).toBe(false);
    }
  });

  it.each(STAGE_NAMES)(
    "hold each %s tool, and none waits on a person",
    (stage) => {
      for (const tool of STAGE[stage]) {
        const command = SCRIPTS.get(tool.name);
        expect(command).toBeDefined();
        expect(command).not.toMatch(INTERACTIVE);
      }
    }
  );

  it("start only the Test services", () => {
    expect(SCRIPTS.get("test:services")).toBe(
      "docker compose -f docker/docker-compose.dev.yml up -d --wait database redis storage image-server cdn"
    );
  });

  it.each(READERS)("%s names only root scripts that exist", (path) => {
    const text = path.endsWith(".md")
      ? read(path)
      : read(path)
          .split("\n")
          .filter((line) => !line.trim().startsWith("#"))
          .join("\n");
    const named = [
      ...text.matchAll(path.endsWith(".md") ? NAMED_IN_DOCS : NAMED),
    ]
      .map(([, name = ""]) => name)
      .filter((name) => !BUILT_IN.has(name));
    expect(named.filter((name) => !SCRIPTS.has(name))).toEqual([]);
  });
});
