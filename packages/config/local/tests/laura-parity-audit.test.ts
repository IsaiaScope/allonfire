// @module-tag unit

import { globSync, readFileSync } from "node:fs";
import { matchesGlob, resolve } from "node:path";
import { REPO } from "../repo";

// Turbo's input list for config leaves Markdown out on purpose: a change to the
// audit alone does not re-run this test from cache. Run it directly:
// `pnpm --filter @allonfire/config exec vitest run local/tests/laura-parity-audit.test.ts`.

const PARITY = {
  AUDIT: "docs/superpowers/specs/2026-11-17-laura-parity-audit.md",
  LAURA: "apps/laura",
  OLD_FILES: "packages/config/local/tests/fixtures/old-laura-files.txt",
  PACKAGE: "apps/laura/package.json",
  SECTION: { FILES: "## Files", LIBRARIES: "## Libraries" },
} as const;
const FATES = ["replaced", "kept", "deleted"] as const;
const KEPT = "kept";

/** A table row's line starts with the pipe: `| a | b | c |`. */
const ROW_START = "|";
const SEPARATOR = /^[\s|:-]+$/;
const HEADER_FATE = "Fate";
/** `fate` or `fate (detail)`. */
const FATE_CELL = /^(\S+)(?: \((.+)\))?$/;
const CODE_SPAN = /`([^`]+)`/g;
const SIDECAR = /(?:^|\/)\._/;
const BRACKET = /[[\]]/g;

type Row = {
  readonly cell: string;
  readonly detail: string | undefined;
  readonly fate: string;
  readonly replacedBy: string;
  readonly spans: readonly string[];
};

const read = (path: string) => readFileSync(resolve(REPO.ROOT, path), "utf8");

/** Square brackets name a folder (`[locale]`), they are never a character class. */
const literalBrackets = (glob: string) => glob.replace(BRACKET, "[$&]");

const parseRow = (line: string): Row | undefined => {
  if (!line.startsWith(ROW_START)) {
    return;
  }
  const cells = line
    .slice(1, line.lastIndexOf("|"))
    .split("|")
    .map((part) => part.trim());
  const [cell = "", fateCell = "", replacedBy = ""] = cells;
  if (SEPARATOR.test(cells.join("")) || fateCell === HEADER_FATE) {
    return;
  }
  const [, fate = "", detail] = fateCell.match(FATE_CELL) ?? [];
  return {
    cell,
    detail,
    fate,
    replacedBy,
    spans: [...cell.matchAll(CODE_SPAN)].map(([, span = ""]) => span),
  };
};

/** The rows under one `##` heading, up to the next one. */
const rowsUnder = (heading: string) => {
  const lines = read(PARITY.AUDIT).split("\n");
  const start = lines.indexOf(heading);
  const after = lines.slice(start + 1);
  const end = after.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? after : after.slice(0, end)).flatMap((line) => {
    const row = parseRow(line);
    return row ? [row] : [];
  });
};

const fileRows = rowsUnder(PARITY.SECTION.FILES);
const libraryRows = rowsUnder(PARITY.SECTION.LIBRARIES);
const allRows = [...fileRows, ...libraryRows];

const lauraPath = (path: string) => `${PARITY.LAURA}/${path}`;
const stripLaura = (path: string) => path.slice(PARITY.LAURA.length + 1);

/** The files under `apps/laura` that a row's path or glob matches today. */
const filesMatching = (span: string) =>
  globSync(literalBrackets(span), {
    cwd: resolve(REPO.ROOT, PARITY.LAURA),
  }).filter((path) => !SIDECAR.test(path));

const declares = (name: string) =>
  read(PARITY.PACKAGE).includes(`\n    "${name}": "`);

const oldFiles = read(PARITY.OLD_FILES)
  .split("\n")
  .filter((path) => path !== "" && !SIDECAR.test(path))
  .map(stripLaura);

const covered = (file: string) =>
  fileRows.some((row) =>
    row.spans.some((span) => matchesGlob(file, literalBrackets(span)))
  );

it("holds a Files table and a Libraries table with rows", () => {
  expect(fileRows.length).toBeGreaterThan(0);
  expect(libraryRows.length).toBeGreaterThan(0);
});

it("gives every row one fate: replaced, kept or deleted, never pending", () => {
  expect(
    allRows
      .filter((row) => !FATES.some((fate) => fate === row.fate))
      .map((row) => row.cell)
  ).toEqual([]);
});

it("explains a detail on a kept row only", () => {
  expect(
    allRows
      .filter((row) => row.detail && row.fate !== KEPT)
      .map((row) => row.cell)
  ).toEqual([]);
});

it("says in every row what replaced the old thing, or why it went", () => {
  expect(
    allRows.filter((row) => row.replacedBy === "").map((row) => row.cell)
  ).toEqual([]);
});

it("names at least one path or library in every row", () => {
  expect(
    allRows.filter((row) => row.spans.length === 0).map((row) => row.cell)
  ).toEqual([]);
});

it("keeps every kept path and leaves no replaced or deleted one", () => {
  const wrong = fileRows.flatMap((row) =>
    row.spans.filter((span) => {
      const exists = filesMatching(span).length > 0;
      return row.fate === KEPT ? !exists : exists;
    })
  );
  expect(wrong).toEqual([]);
});

it("declares every kept library and none of the others", () => {
  const wrong = libraryRows.flatMap((row) =>
    row.spans.filter((name) => declares(name) !== (row.fate === KEPT))
  );
  expect(wrong).toEqual([]);
});

it("has a row for every file the old Laura had", () => {
  expect(oldFiles.length).toBeGreaterThan(0);
  expect(oldFiles.filter((file) => !covered(file))).toEqual([]);
});

it("lists the old files as repo paths, each under the Laura folder", () => {
  expect(
    read(PARITY.OLD_FILES)
      .split("\n")
      .filter((path) => path !== "" && !path.startsWith(lauraPath("")))
  ).toEqual([]);
});
