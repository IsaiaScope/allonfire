// @module-tag integration
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PrismaClient } from "../../generated/prisma/client";
import {
  clientFor,
  dropDatabase,
  executeFile,
  liquibase,
  PACKAGE_DIR,
  recreateDatabase,
  tablesIn,
  throwawayUrl,
} from "./throwaway-db";

// Liquibase runs in Docker; the first build pulls the image.
const DOCKER_TIMEOUT = 300_000;

const AUTH_TABLES = ["Account", "Session", "User", "Verification"];
const LAURA_TABLES = [
  "Favorite",
  "GameScore",
  "Photo",
  "QuizAnswer",
  "QuizQuestion",
];
const ALL_TABLES = [...AUTH_TABLES, ...LAURA_TABLES].sort();

const BASELINE = resolve(PACKAGE_DIR, "changelog/changesets/0000-baseline.sql");
const EXISTING_USER = "existing-user";

describe("changelog on an empty database", () => {
  const database = "allonfire_changelog_fresh";
  const url = throwawayUrl(database);
  let client: PrismaClient;

  beforeAll(async () => {
    await recreateDatabase(database);
    client = clientFor(url);
    liquibase(url, "update");
  }, DOCKER_TIMEOUT);

  afterAll(async () => {
    await client.$disconnect();
    await dropDatabase(database);
  });

  it("puts the auth tables in auth", async () => {
    expect(await tablesIn(client, "auth")).toEqual(AUTH_TABLES);
  });

  it("puts the laura tables in laura", async () => {
    expect(await tablesIn(client, "laura")).toEqual(LAURA_TABLES);
  });

  it("leaves nothing of ours in public", async () => {
    expect(await tablesIn(client, "public")).toEqual([]);
  });
});

describe("changelog on a database that already has the tables", () => {
  // Production and every existing local database: built by prisma db push.
  const database = "allonfire_changelog_existing";
  const url = throwawayUrl(database);
  let client: PrismaClient;

  beforeAll(async () => {
    await recreateDatabase(database);
    executeFile(url, BASELINE);
    client = clientFor(url);
    await client.$executeRaw`
      INSERT INTO public."User" (id, email, "updatedAt")
      VALUES (${EXISTING_USER}, 'existing@allonfire.test', now())
    `;
    liquibase(url, "update");
  }, DOCKER_TIMEOUT);

  afterAll(async () => {
    await client.$disconnect();
    await dropDatabase(database);
  });

  it("records the baseline as ran without executing it", async () => {
    const rows = await client.$queryRaw<{ exectype: string }[]>`
      SELECT exectype FROM public.databasechangelog WHERE id = '0000-baseline'
    `;
    expect(rows).toEqual([{ exectype: "MARK_RAN" }]);
  });

  it("applies the schema move", async () => {
    const rows = await client.$queryRaw<{ exectype: string }[]>`
      SELECT exectype FROM public.databasechangelog
      WHERE id = '0001-auth-laura-schemas'
    `;
    expect(rows).toEqual([{ exectype: "EXECUTED" }]);
  });

  it("keeps existing rows", async () => {
    const rows = await client.$queryRaw<{ id: string }[]>`
      SELECT id FROM auth."User"
    `;
    expect(rows).toEqual([{ id: EXISTING_USER }]);
  });
});

describe("rolling back the schema move", () => {
  const database = "allonfire_changelog_rollback";
  const url = throwawayUrl(database);
  let client: PrismaClient;

  beforeAll(async () => {
    await recreateDatabase(database);
    client = clientFor(url);
    liquibase(url, "update");
  }, DOCKER_TIMEOUT);

  afterAll(async () => {
    await client.$disconnect();
    await dropDatabase(database);
  });

  it(
    "puts every table back in public and drops the App schemas",
    async () => {
      liquibase(url, "rollback-count", "--count=1");
      expect(await tablesIn(client, "public")).toEqual(ALL_TABLES);
      const schemas = await client.$queryRaw<{ schema_name: string }[]>`
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name IN ('auth', 'laura')
      `;
      expect(schemas).toEqual([]);
    },
    DOCKER_TIMEOUT
  );

  it(
    "moves them again on the next update",
    async () => {
      liquibase(url, "update");
      expect(await tablesIn(client, "auth")).toEqual(AUTH_TABLES);
      expect(await tablesIn(client, "laura")).toEqual(LAURA_TABLES);
    },
    DOCKER_TIMEOUT
  );
});

const { version } = JSON.parse(
  readFileSync(resolve(PACKAGE_DIR, "../../package.json"), "utf8")
) as { version: string };
const RELEASE_TAG = `v${version}`;

async function tags(client: PrismaClient): Promise<string[]> {
  const rows = await client.$queryRaw<{ tag: string }[]>`
    SELECT tag FROM public.databasechangelog
    WHERE tag IS NOT NULL ORDER BY orderexecuted
  `;
  return rows.map((row) => row.tag);
}

describe("deploy", () => {
  const database = "allonfire_changelog_deploy";
  const url = throwawayUrl(database);
  let client: PrismaClient;

  beforeAll(async () => {
    await recreateDatabase(database);
    client = clientFor(url);
  });

  afterAll(async () => {
    await client.$disconnect();
    await dropDatabase(database);
  });

  it(
    "tags the release after applying changesets",
    async () => {
      liquibase(url, "deploy");
      expect(await tags(client)).toEqual([RELEASE_TAG]);
    },
    DOCKER_TIMEOUT
  );

  it(
    "leaves the tag alone when nothing is pending",
    async () => {
      // Tagging again would rewrite the newest row and erase the release tag.
      liquibase(url, "deploy");
      expect(await tags(client)).toEqual([RELEASE_TAG]);
    },
    DOCKER_TIMEOUT
  );
});
