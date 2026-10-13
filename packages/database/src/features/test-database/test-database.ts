import { databaseUrl, staleTestDatabases, testDatabaseName } from "./names";
import { databasesOnServer, dropDatabase, onServer } from "./server";
import { ensureTemplate } from "./template";

/** Drops what `staleTestDatabases` lists; `keep` is the template this run clones. */
export async function sweepTestDatabases(
  serverUrl: string,
  keep: string,
  now = new Date()
): Promise<string[]> {
  const stale = staleTestDatabases(
    await databasesOnServer(serverUrl),
    keep,
    now
  );
  await Promise.all(stale.map((name) => dropDatabase(serverUrl, name)));
  return stale;
}

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
