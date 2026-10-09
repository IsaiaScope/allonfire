// @module-tag integration

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseJsonWith } from "@allonfire/core/shared/utils/json";
import { z } from "zod";
import type { PrismaClient } from "../../generated/prisma/client";
import { CHANGESET_FILE } from "../../scripts/changeset-file";
import {
  clientFor,
  DOCKER_TIMEOUT,
  dropDatabase,
  executeFile,
  liquibase,
  PACKAGE_DIR,
  recreateDatabase,
  tablesIn,
  throwawayUrl,
} from "./throwaway-db";

const AUTH_TABLES = [
  "Account",
  "Membership",
  "Session",
  "User",
  "Verification",
];
const LAURA_TABLES = ["GameScore"];
const IMAGE_TABLES = ["Image", "ImageApp"];
/** What the baseline holds in public; 0003 dropped Laura's photo and quiz tables, its rollback brings them back. */
const BASELINE_TABLES = [
  "Account",
  "Session",
  "User",
  "Verification",
  ...LAURA_TABLES,
  "Favorite",
  "Photo",
  "QuizAnswer",
  "QuizQuestion",
].sort();

const BASELINE = resolve(PACKAGE_DIR, "changelog/changesets/0000-baseline.sql");
const EXISTING_USER = "existing-user";
const LAURA_VIEWER = "laura-viewer";
/** A User whose access was revoked by deleting their Memberships. */
const NO_MEMBERSHIP = "no-membership";

/** Every changeset above the baseline, so the rollback test survives new ones. */
const CHANGESETS_AFTER_BASELINE =
  readdirSync(resolve(PACKAGE_DIR, "changelog/changesets")).filter((file) =>
    CHANGESET_FILE.test(file)
  ).length - 1;

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

  it("puts the Image tables in image", async () => {
    expect(await tablesIn(client, "image")).toEqual(IMAGE_TABLES);
  });

  it("places an Image in each App once, private by default, gone with the Image", async () => {
    await client.$executeRaw`
      INSERT INTO image."Image" (id, key, width, height, bytes, "blurDataUrl", alt)
      VALUES ('placed', 'placed.avif', 1, 1, 1, '', '{}')
    `;
    await client.$executeRaw`
      INSERT INTO image."ImageApp" ("imageId", app) VALUES ('placed', 'laura')
    `;
    // The key is (imageId, app): the same App twice is refused.
    await expect(
      client.$executeRaw`
        INSERT INTO image."ImageApp" ("imageId", app) VALUES ('placed', 'laura')
      `
    ).rejects.toThrow();
    expect(
      await client.$queryRaw<{ public: boolean }[]>`
        SELECT public FROM image."ImageApp"
      `
    ).toEqual([{ public: false }]);
    await client.$executeRaw`DELETE FROM image."Image" WHERE id = 'placed'`;
    expect(
      await client.$queryRaw<{ imageId: string }[]>`
        SELECT "imageId" FROM image."ImageApp"
      `
    ).toEqual([]);
  });

  it("keeps no App on Image itself", async () => {
    const columns = await client.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'image' AND table_name = 'Image'
        AND column_name = 'app'
    `;
    expect(columns).toEqual([]);
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
    await client.$executeRaw`
      INSERT INTO public."User" (id, email, "updatedAt", role, "allowedApps")
      VALUES (${LAURA_VIEWER}, 'viewer@allonfire.test', now(), 'VIEWER', ARRAY['laura', 'social'])
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
      SELECT id FROM auth."User" ORDER BY id
    `;
    expect(rows).toEqual([{ id: EXISTING_USER }, { id: LAURA_VIEWER }]);
  });

  it("turns each User's Allowed apps and Role into Memberships", async () => {
    const rows = await client.$queryRaw<
      { userId: string; app: string; role: string }[]
    >`
      SELECT m."userId", m.app::TEXT AS app, m.role::TEXT AS role
      FROM auth."Membership" m ORDER BY m."userId", m.app
    `;
    // `all` reached every App; `laura` Laura; `social` nothing. `m.app`
    // sorts by the enum's declaration order, `app` would sort the text.
    expect(rows).toEqual([
      { app: "laura", role: "USER", userId: EXISTING_USER },
      { app: "back-office", role: "USER", userId: EXISTING_USER },
      { app: "laura", role: "VIEWER", userId: LAURA_VIEWER },
    ]);
  });

  it("drops role and allowedApps from User", async () => {
    const columns = await client.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'User'
        AND column_name IN ('role', 'allowedApps')
    `;
    expect(columns).toEqual([]);
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
    await client.$executeRaw`
      INSERT INTO auth."User" (id, email, "updatedAt") VALUES
        (${LAURA_VIEWER}, 'viewer@allonfire.test', now()),
        (${NO_MEMBERSHIP}, 'revoked@allonfire.test', now())
    `;
    await client.$executeRaw`
      INSERT INTO auth."Membership" ("userId", app, role)
      VALUES (${LAURA_VIEWER}, 'laura', 'VIEWER')
    `;
  }, DOCKER_TIMEOUT);

  afterAll(async () => {
    await client.$disconnect();
    await dropDatabase(database);
  });

  it(
    "puts every table back in public and drops the App schemas",
    async () => {
      liquibase(url, "rollback-count", `--count=${CHANGESETS_AFTER_BASELINE}`);
      // 0003's rollback drops ImageApp before Image, which it references.
      expect(await tablesIn(client, "image")).toEqual([]);
      expect(await tablesIn(client, "public")).toEqual(BASELINE_TABLES);
      const schemas = await client.$queryRaw<{ schema_name: string }[]>`
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name IN ('auth', 'image', 'laura')
      `;
      expect(schemas).toEqual([]);
    },
    DOCKER_TIMEOUT
  );

  it("gives a User back the Apps and Role their Memberships held, and nothing without one", async () => {
    const rows = await client.$queryRaw<
      { id: string; role: string; allowedApps: string[] }[]
    >`
      SELECT id, role::TEXT AS role, "allowedApps" FROM public."User" ORDER BY id
    `;
    expect(rows).toEqual([
      { allowedApps: ["laura"], id: LAURA_VIEWER, role: "VIEWER" },
      { allowedApps: [], id: NO_MEMBERSHIP, role: "VIEWER" },
    ]);
  });

  it(
    "moves them again on the next update",
    async () => {
      liquibase(url, "update");
      expect(await tablesIn(client, "auth")).toEqual(AUTH_TABLES);
      expect(await tablesIn(client, "laura")).toEqual(LAURA_TABLES);
      expect(await tablesIn(client, "image")).toEqual(IMAGE_TABLES);
    },
    DOCKER_TIMEOUT
  );
});

const { version } = parseJsonWith(
  readFileSync(resolve(PACKAGE_DIR, "../../package.json"), "utf8"),
  z.object({ version: z.string() })
);
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
