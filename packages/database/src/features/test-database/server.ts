import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { PrismaClient } from "../../../generated/prisma/client";
import { databaseUrl } from "./names";

export const PACKAGE_DIR = resolve(import.meta.dirname, "../../..");

/** Liquibase runs in Docker; the first build pulls the image. */
export const DOCKER_TIMEOUT = 5 * UNIT.MS_PER_MINUTE;

/** Runs `run` on a client for `url`, disconnected however it ends. */
export async function withClient<T>(
  url: string,
  run: (client: PrismaClient) => Promise<T>
): Promise<T> {
  const client = new PrismaClient({ datasourceUrl: url });
  try {
    return await run(client);
  } finally {
    await client.$disconnect();
  }
}

/** Runs `run` on the server's maintenance database, `postgres`. */
export const onServer = <T>(
  serverUrl: string,
  run: (client: PrismaClient) => Promise<T>
): Promise<T> => withClient(databaseUrl(serverUrl, "postgres"), run);

export const databasesOnServer = (serverUrl: string) =>
  onServer(serverUrl, async (client) =>
    (
      await client.$queryRaw<
        { datname: string }[]
      >`SELECT datname FROM pg_database`
    ).map(({ datname }) => datname)
  );

/**
 * `name` comes from `names.ts` or a test's constant (lowercase, digits,
 * underscores), never from input: DDL takes no bind parameter.
 */
export const dropDatabase = (serverUrl: string, name: string) =>
  onServer(serverUrl, (client) =>
    client.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
  );

export const createDatabase = (serverUrl: string, name: string) =>
  onServer(serverUrl, (client) =>
    client.$executeRawUnsafe(`CREATE DATABASE ${name}`)
  );

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
