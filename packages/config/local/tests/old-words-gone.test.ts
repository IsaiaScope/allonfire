// @module-tag unit

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { REPO } from "../repo";

const THIS_FILE = relative(REPO.ROOT, import.meta.filename);
const BINARY =
  /\.(?:png|jpe?g|gif|webp|avif|heic|ico|woff2?|ttf|otf|pdf|zip|gz|mp[34]|mov|wasm)$/i;
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const SIDECAR = /(?:^|\/)\._/;

/** A path, or a folder or name prefix, where a gate's word is right, and why. */
type Allowed = readonly [prefix: string | RegExp, reason: string];

/** Allowed for every gate. */
const HISTORY_AND_VENDORED: readonly Allowed[] = [
  ["docs/superpowers/", "plans, specs and the parity audit are history"],
  [".claude/skills/impeccable/", "vendored skill"],
  [".claude/skills/next-", "vendored skills"],
  [".claude/agents/impeccable-", "vendored agents"],
  ["pnpm-lock.yaml", "generated"],
  ["packages/database/changelog/changesets/", "migrations name removed values"],
  [
    "packages/database/liquibase/tests/changelog.integration.test.ts",
    "the migration's test names the removed values",
  ],
];

const BANNED_BY_NAME: readonly Allowed[] = [
  ["packages/config/local/tests/laura-app.test.ts", "names what Laura bans"],
];

const GATES = [
  {
    allowed: [
      ["CONTEXT.md", "Memory game's `_Avoid_` line"],
      [
        "packages/config/local/tests/fixtures/old-laura-files.txt",
        "the old file list the parity audit is checked against",
      ],
      ["packages/design/src/apps/tests/apps.test.ts", "bans the word"],
      ["packages/design/src/apps/laura/PRODUCT.md", "bans the word"],
      ["packages/config/local/tests/old-world-gone.test.ts", "gone-page names"],
    ],
    name: "Quiz",
    pattern: /quiz|GameType/i,
  },
  {
    allowed: [
      ["docs/adr/0019", "the Role's history"],
      ["docs/adr/0032", "the Role's history"],
      ["CONTEXT.md", "the Viewer entry says Laura's floor was once Viewer"],
      [TEST_FILE, "tests prove a Laura Viewer is refused"],
      ["docs/guides/laura.md", "says Laura has no Viewer"],
      ["packages/design/src/apps/laura/PRODUCT.md", "bans the word"],
    ],
    name: "Laura's Viewer",
    // The Viewer Role stays (ADR 0032): a line naming it and Laura is the old logic.
    pattern:
      /laura[^\n]*\b(?:VIEWER|Viewers?)\b|\b(?:VIEWER|Viewers?)\b[^\n]*laura/i,
  },
  {
    allowed: [
      ["docs/adr/0010", "history"],
      ["docs/adr/0017", "history"],
      ["docs/adr/0021", "history"],
      ...BANNED_BY_NAME,
    ],
    name: "the pause",
    // No bare "paused": it is also a prop and a CSS class.
    pattern:
      /until (?:it is |its |the |Laura's )?(?:rebuilt|rebuild|cutover)|once rebuilt|Laura (?:is|keeps|joins) (?:paused|out of)|Laura is paused|out of Production|[Hh]eld only by (?:Laura|the games)|laura still turns|old Next-bound|waits for Laura|answers 404 until|rebuilt in Phases/i,
  },
  {
    allowed: [...BANNED_BY_NAME],
    name: "heic2any and Framer Motion",
    pattern: /heic2any|framer[- ]motion/i,
  },
] as const satisfies readonly {
  name: string;
  pattern: RegExp;
  allowed: readonly Allowed[];
}[];

/** Every file git knows or would take, still on disk, with its lines. */
const sources = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: REPO.ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
)
  .split("\n")
  .filter(
    (path) =>
      path !== "" &&
      path !== THIS_FILE &&
      !BINARY.test(path) &&
      !SIDECAR.test(path) &&
      existsSync(resolve(REPO.ROOT, path))
  )
  .flatMap((path) => {
    const full = resolve(REPO.ROOT, path);
    return statSync(full).isFile()
      ? [{ lines: readFileSync(full, "utf8").split("\n"), path }]
      : [];
  });

const isAllowed = (path: string, allowed: readonly Allowed[]) =>
  allowed.some(([prefix]) =>
    typeof prefix === "string" ? path.startsWith(prefix) : prefix.test(path)
  );

describe("the old words", () => {
  it.each(GATES)("$name is gone", ({ pattern, allowed }) => {
    const every: readonly Allowed[] = [...HISTORY_AND_VENDORED, ...allowed];
    const offenders = sources
      .filter(({ path }) => !isAllowed(path, every))
      .flatMap(({ path, lines }) =>
        lines.flatMap((line, index) =>
          pattern.test(line)
            ? [`${path}:${index + 1}: ${line.trim().slice(0, 160)}`]
            : []
        )
      );

    expect(offenders).toEqual([]);
  });
});
