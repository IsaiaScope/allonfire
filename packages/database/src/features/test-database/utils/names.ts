import {
  isStaleTestRun,
  testRunName,
} from "@allonfire/config/tests/run/test-run";

/**
 * A run's clone, from its stamp (`testRunStamp`): lowercase, digits and
 * underscores; anything else throws before any SQL runs.
 */
export const testDatabaseName = (label: string, stamp: string) =>
  testRunName(label, stamp);

/**
 * A template, named by when it was built and the start of its fingerprint, so
 * trees built from other sources never replace each other's. It ages like a
 * clone (`isStaleTestRun`); the sweep keeps the current one.
 */
export const templateName = (fingerprint: string, epochSeconds: number) =>
  testRunName("template", `${epochSeconds}_${fingerprint}`);

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
