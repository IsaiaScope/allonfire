import { execFileSync } from "node:child_process";
import { testRunStamp } from "@allonfire/config/tests/run/test-run";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../../src/environment/environment";
import {
  databaseUrl,
  testDatabaseName,
} from "../../src/features/test-database/names";
import {
  createDatabase,
  dropDatabase as dropOnServer,
  PACKAGE_DIR,
} from "../../src/features/test-database/server";

const LIQUIBASE_TABLE = /^databasechangelog/;
/** This run's: two runs at once (a watch and the hook) never share a database. */
const RUN_STAMP = testRunStamp();

/** A database name for `label` in this run, swept like a Test database if left behind. */
export const throwawayName = (label: string) =>
  testDatabaseName(label, RUN_STAMP);

/** A Docker volume name for `label` in this run. */
export const throwawayVolume = (label: string) =>
  throwawayName(label).replaceAll("_", "-");

/** The Local or CI server's URL, pointed at another database on it. */
export function throwawayUrl(database: string): string {
  return databaseUrl(env.DATABASE_URL, database);
}

export async function dropDatabase(database: string): Promise<void> {
  await dropOnServer(env.DATABASE_URL, database);
}

export async function recreateDatabase(database: string): Promise<void> {
  await dropDatabase(database);
  await createDatabase(env.DATABASE_URL, database);
}

/** Runs a SQL file the way `prisma db push` would have left a database. */
export function executeFile(url: string, file: string): void {
  execFileSync(
    "pnpm",
    ["exec", "prisma", "db", "execute", "--file", file, "--url", url],
    { cwd: PACKAGE_DIR, encoding: "utf8", stdio: "pipe" }
  );
}

export function clientFor(url: string): PrismaClient {
  return new PrismaClient({ datasourceUrl: url });
}

/** Tables in `schema`, sorted, without Liquibase's own two. */
export async function tablesIn(
  client: PrismaClient,
  schema: string
): Promise<string[]> {
  const rows = await client.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = ${schema}
  `;
  return rows
    .map((row) => row.table_name)
    .filter((name) => !LIQUIBASE_TABLE.test(name))
    .sort();
}
