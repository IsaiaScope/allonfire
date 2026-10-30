import { isStaleTestRun } from "@allonfire/config/tests/run/test-run";

const TEST_DATABASE_PREFIX = "allonfire_test_";
export const TEMPLATE_PREFIX = `${TEST_DATABASE_PREFIX}template_`;
/** What a name may hold: Postgres takes it unquoted, and DDL takes no bind parameter. */
const SAFE_NAME = /^[a-z0-9_]+$/;

/**
 * A run's clone, from its stamp (`testRunStamp`): lowercase, digits and
 * underscores; anything else throws before any SQL runs.
 */
export function testDatabaseName(label: string, stamp: string): string {
  const name = `${TEST_DATABASE_PREFIX}${label.toLowerCase().replaceAll("-", "_")}_${stamp}`;
  if (!SAFE_NAME.test(name)) {
    throw new Error(`Not a safe Test database name: ${name}`);
  }
  return name;
}

/**
 * A template, named by when it was built and the start of its fingerprint, so
 * trees built from other sources never replace each other's. It ages like a
 * clone (`isStaleTestRun`); the sweep keeps the current one.
 */
export const templateName = (fingerprint: string, epochSeconds: number) =>
  `${TEMPLATE_PREFIX}${epochSeconds}_${fingerprint}`;

/**
 * What a sweep drops out of `names`: crashed runs' clones and old templates,
 * never one a run still going holds, nor `keep` (the template in use, however
 * old its name).
 */
export const staleTestDatabases = (
  names: readonly string[],
  keep: string,
  now: Date
) => names.filter((name) => name !== keep && isStaleTestRun(name, now));

/** `serverUrl` pointed at another database on the same server. */
export function databaseUrl(serverUrl: string, database: string): string {
  const url = new URL(serverUrl);
  url.pathname = `/${database}`;
  url.search = "";
  return url.toString();
}
