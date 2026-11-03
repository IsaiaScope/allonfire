// pnpm db:changeset <kebab-name>: drafts a Liquibase changeset from the
// difference between the database (brought to changelog head first) and
// prisma/schema. Prisma drafts, a human reviews, Liquibase owns (ADR 0008).
import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PATTERN } from "@allonfire/core/shared/constants/patterns";
import { TEST_DATABASE } from "../src/features/test-database/constants/test-database";
import {
  buildChangeset,
  CHANGESET,
  isEmptySql,
  nextChangesetNumber,
} from "./changeset-file";

const SCHEMA = "prisma/schema";

function prismaDiff(from: string[], to: string[]): string {
  return execFileSync(
    "prisma",
    ["migrate", "diff", ...from, ...to, "--script"],
    { cwd: TEST_DATABASE.PACKAGE_ROOT, encoding: "utf8" }
  );
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const name = process.argv[2] ?? "";
if (!PATTERN.CHANGESET.NAME.test(name)) {
  fail("Usage: pnpm db:changeset <kebab-case-name>");
}

execFileSync("bash", ["scripts/liquibase.sh", "update"], {
  cwd: TEST_DATABASE.PACKAGE_ROOT,
  stdio: "inherit",
});

const forward = prismaDiff(
  ["--from-schema-datasource", SCHEMA],
  ["--to-schema-datamodel", SCHEMA]
);
if (isEmptySql(forward)) {
  fail("No schema change: the database already matches prisma/schema.");
}
const rollback = prismaDiff(
  ["--from-schema-datamodel", SCHEMA],
  ["--to-schema-datasource", SCHEMA]
);

const id = `${nextChangesetNumber(readdirSync(CHANGESET.DIR))}-${name}`;
const file = resolve(CHANGESET.DIR, `${id}.sql`);
writeFileSync(file, buildChangeset({ forward, id, rollback }));
process.stdout.write(
  `Wrote ${file}\nReview it (drops, renames, type changes), then run pnpm db:update.\n`
);
