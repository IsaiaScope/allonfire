import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { seedFixtures } from "../seed/fixtures/seed-fixtures";
import {
  databaseUrl,
  TEMPLATE_PREFIX,
  templateName,
  testDatabaseName,
} from "./names";
import {
  createDatabase,
  databasesOnServer,
  liquibase,
  onServer,
  PACKAGE_DIR,
  withClient,
} from "./server";

/**
 * What the template is built from: a change to any file builds a new one. The
 * db-migrate image (`liquibase/`) runs the changelog, so it counts too.
 */
export const TEMPLATE_SOURCES = ["changelog", "liquibase", "src/features/seed"];
/** Any constant; every run asks Postgres for this one lock. */
const TEMPLATE_LOCK = 4_180_017;

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

/** sha256 over the sources' paths and contents. */
export function templateFingerprint(
  root = PACKAGE_DIR,
  sources: readonly string[] = TEMPLATE_SOURCES
): string {
  const hash = createHash("sha256");
  for (const file of sources.flatMap((dir) => filesUnder(root, dir))) {
    hash.update(file).update(readFileSync(join(root, file)));
  }
  return hash.digest("hex");
}

/** The template's name carries this much of the fingerprint. */
const NAME_FINGERPRINT_LENGTH = 6;

const templateFor = async (serverUrl: string, fingerprint: string) =>
  (await databasesOnServer(serverUrl)).find(
    (name) =>
      name.startsWith(TEMPLATE_PREFIX) && name.endsWith(`_${fingerprint}`)
  );

/**
 * A template's working name while it is built: it carries the building
 * process, so a build that died is stale at once (`isStaleTestRun`), not a
 * day later.
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
  const fingerprint = templateFingerprint().slice(0, NAME_FINGERPRINT_LENGTH);
  const found = await templateFor(serverUrl, fingerprint);
  if (found) {
    return found;
  }
  // A session-level lock, released when the session ends: disconnecting frees
  // it, whatever failed, and no unlock can hide the error that did.
  return onServer(serverUrl, async (lock) => {
    await lock.$executeRaw`SELECT pg_advisory_lock(${TEMPLATE_LOCK})`;
    return (
      (await templateFor(serverUrl, fingerprint)) ??
      (await buildTemplate(serverUrl, fingerprint))
    );
  });
}
