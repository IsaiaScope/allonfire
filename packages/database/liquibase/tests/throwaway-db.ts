import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../../src/environment/environment";

export const PACKAGE_DIR = resolve(import.meta.dirname, "../..");

const LIQUIBASE_TABLE = /^databasechangelog/;

/** The dev/CI server's URL, pointed at another database on it. */
export function throwawayUrl(database: string): string {
  const url = new URL(env.DATABASE_URL);
  url.pathname = `/${database}`;
  url.search = "";
  return url.toString();
}

async function onServer(sql: string): Promise<void> {
  const admin = new PrismaClient();
  try {
    await admin.$executeRawUnsafe(sql);
  } finally {
    await admin.$disconnect();
  }
}

export async function dropDatabase(database: string): Promise<void> {
  await onServer(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
}

export async function recreateDatabase(database: string): Promise<void> {
  await dropDatabase(database);
  await onServer(`CREATE DATABASE "${database}"`);
}

/**
 * Runs the db-migrate image against `url`; returns its stdout. `extraEnv`
 * holds `NAME=value` pairs for scripts/liquibase.sh (DB_BACKUPS_VOLUME,
 * BACKUP_KEEP).
 */
export function migrateImage(
  url: string,
  extraEnv: readonly string[],
  ...args: string[]
): string {
  // env(1) sets these for the child and inherits everything else. `stdio:
  // "pipe"` keeps Liquibase's stderr out of the test output; a failure still
  // carries it in the thrown error.
  return execFileSync(
    "env",
    [
      `DATABASE_URL=${url}`,
      ...extraEnv,
      "bash",
      "scripts/liquibase.sh",
      ...args,
    ],
    { cwd: PACKAGE_DIR, encoding: "utf8", stdio: "pipe" }
  );
}

/** Runs a Liquibase command in the db-migrate image against `url`. */
export function liquibase(url: string, ...args: string[]): string {
  return migrateImage(url, [], ...args);
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
