import { isTestRunOf } from "@allonfire/config/tests/run/test-run";
import { databaseUrl, staleTestDatabases, testDatabaseName } from "./names";
import { databasesOnServer, dropDatabase, onServer } from "./server";
import { ensureTemplate } from "./template";

/** Drops the databases `pick` chooses from the server's list; returns their names. */
async function dropPicked(
  serverUrl: string,
  pick: (names: string[]) => string[]
): Promise<string[]> {
  const picked = pick(await databasesOnServer(serverUrl));
  await Promise.all(picked.map((name) => dropDatabase(serverUrl, name)));
  return picked;
}

/** Drops what `staleTestDatabases` lists; `keep` is the template this run clones. */
export const sweepTestDatabases = (
  serverUrl: string,
  keep: string,
  now = new Date()
) => dropPicked(serverUrl, (names) => staleTestDatabases(names, keep, now));

/**
 * A Test database for one run: the template for this tree (built when
 * missing), crashed runs' leftovers swept, then a clone; returns its URL.
 */
export async function createTestDatabase(
  serverUrl: string,
  label: string,
  stamp: string
): Promise<string> {
  const template = await ensureTemplate(serverUrl);
  await sweepTestDatabases(serverUrl, template);
  const name = testDatabaseName(label, stamp);
  await onServer(serverUrl, (client) =>
    client.$executeRawUnsafe(`CREATE DATABASE ${name} TEMPLATE ${template}`)
  );
  return databaseUrl(serverUrl, name);
}

/** Drops the run's clone; one already gone is no error. */
export const dropTestDatabase = (
  serverUrl: string,
  label: string,
  stamp: string
) => dropDatabase(serverUrl, testDatabaseName(label, stamp));

/**
 * Drops every run of `label`, whatever its age; returns their names. Only for
 * a label one run at a time holds (e2e: its API's port lets no second run
 * start), where an earlier run's clone is always a leftover: Playwright runs
 * no global teardown when a web server fails to start.
 */
export const dropTestDatabasesOf = (serverUrl: string, label: string) =>
  dropPicked(serverUrl, (names) =>
    names.filter((name) => isTestRunOf(name, label))
  );
