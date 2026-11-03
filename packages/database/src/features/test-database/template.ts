import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { seedFixtures } from "../seed/fixtures/seed-fixtures";
import { TEST_DATABASE } from "./constants/test-database";
import { databaseUrl, templateName, testDatabaseName } from "./names";
import {
  createDatabase,
  databasesOnServer,
  liquibase,
  onServer,
  withClient,
} from "./server";

/**
 * The files under `dir` that build something: dotfiles (`.DS_Store`, exFAT's
 * `._*`) and `tests/` folders never reach the template.
 */
const filesUnder = (root: string, dir: string): string[] =>
  readdirSync(join(root, dir), { recursive: true, withFileTypes: true })
    .map((entry) => ({
      entry,
      path: relative(root, join(entry.parentPath, entry.name)),
    }))
    .filter(
      ({ entry, path }) =>
        entry.isFile() &&
        !entry.name.startsWith(".") &&
        !path.split(sep).includes("tests")
    )
    .map(({ path }) => path)
    .sort();

/**
 * sha256 over the sources' paths and contents.
 * @internal
 */
export function templateFingerprint(
  root = TEST_DATABASE.PACKAGE_ROOT,
  sources: readonly string[] = TEST_DATABASE.TEMPLATE.SOURCES
): string {
  const hash = createHash("sha256");
  for (const file of sources.flatMap((dir) => filesUnder(root, dir))) {
    hash.update(file).update(readFileSync(join(root, file)));
  }
  return hash.digest("hex");
}

const templateFor = async (serverUrl: string, fingerprint: string) =>
  (await databasesOnServer(serverUrl)).find(
    (name) =>
      name.startsWith(TEST_DATABASE.TEMPLATE.PREFIX) &&
      name.endsWith(`_${fingerprint}`)
  );

/**
 * A template's working name while it is built: it carries the building
 * process, so a build that died is stale at once (`isStaleTestRun`), not a
 * day later.
 * @internal
 */
export const buildingName = (
  fingerprint: string,
  epoch: number,
  pid: number = process.pid
) => testDatabaseName("building", `${epoch}_${pid}_${fingerprint}`);

/**
 * Built under a working name and renamed once seeded, so a build that dies
 * halfway is never taken for a template; the sweep drops the leftover.
 */
async function buildTemplate(serverUrl: string, fingerprint: string) {
  const epoch = Math.floor(Date.now() / UNIT.MS_PER_SECOND);
  const building = buildingName(fingerprint, epoch);
  const name = templateName(fingerprint, epoch);
  await createDatabase(serverUrl, building);
  const url = databaseUrl(serverUrl, building);
  liquibase(url, "update");
  await withClient(url, seedFixtures);
  await onServer(serverUrl, (client) =>
    client.$executeRawUnsafe(`ALTER DATABASE ${building} RENAME TO ${name}`)
  );
  return name;
}

/**
 * The template for this tree's changelog and Fixtures, built when no database
 * on the server carries its fingerprint; returns its name. A session-level
 * advisory lock makes parallel runs build it once: the second waits, then
 * finds it.
 */
export async function ensureTemplate(serverUrl: string): Promise<string> {
  const fingerprint = templateFingerprint().slice(
    0,
    TEST_DATABASE.TEMPLATE.FINGERPRINT_LENGTH
  );
  const found = await templateFor(serverUrl, fingerprint);
  if (found) {
    return found;
  }
  // A session-level lock, released when the session ends: disconnecting frees
  // it, whatever failed, and no unlock can hide the error that did.
  return onServer(serverUrl, async (lock) => {
    await lock.$executeRaw`SELECT pg_advisory_lock(${TEST_DATABASE.TEMPLATE.LOCK})`;
    return (
      (await templateFor(serverUrl, fingerprint)) ??
      (await buildTemplate(serverUrl, fingerprint))
    );
  });
}
