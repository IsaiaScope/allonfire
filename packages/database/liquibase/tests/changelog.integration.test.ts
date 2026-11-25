// @module-tag integration

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { PATTERN } from "@allonfire/core/shared/constants/patterns";
import { parseJsonWith } from "@allonfire/core/shared/utils/json";
import { z } from "zod";
import type { PrismaClient } from "../../generated/prisma/client";
import { CHANGESET } from "../../scripts/changeset-file";
import { TEST_DATABASE } from "../../src/features/test-database/constants/test-database";
import { liquibase } from "../../src/features/test-database/utils/server";
import {
  clientFor,
  dropDatabase,
  executeFile,
  recreateDatabase,
  tablesIn,
  throwawayName,
  throwawayUrl,
} from "./throwaway-db";

const AUTH_TABLES = [
  "Account",
  "Membership",
  "Session",
  "User",
  "Verification",
];
const LAURA_TABLES = ["Favorite", "MemoryScore", "Profile", "ProfileFavorite"];
const IMAGE_TABLES = ["Image", "ImageApp"];
/** What the baseline holds in public; 0003 dropped Laura's photo and quiz tables, its rollback brings them back. */
const BASELINE_TABLES = [
  "Account",
  "Session",
  "User",
  "Verification",
  "GameScore",
  "Favorite",
  "Photo",
  "QuizAnswer",
  "QuizQuestion",
].sort();

const BASELINE = resolve(CHANGESET.DIR, "0000-baseline.sql");
const EXISTING_USER = "existing-user";
const LAURA_VIEWER = "laura-viewer";
/** A User whose access was revoked by deleting their Memberships. */
const NO_MEMBERSHIP = "no-membership";

const LAURA_VIEWERS_FILE = "0008-laura-viewers-to-users.sql";
/** Every changeset from the one that moves Laura's Viewers on, so the test survives later ones. */
const CHANGESETS_FROM_LAURA_VIEWERS = readdirSync(CHANGESET.DIR).filter(
  (file) => PATTERN.CHANGESET.FILE.test(file) && file >= LAURA_VIEWERS_FILE
).length;
const LAURA_VIEWER_MEMBER = "a-laura-viewer";
const LAURA_ADMIN_MEMBER = "b-laura-admin";
const BACK_OFFICE_VIEWER_MEMBER = "c-back-office-viewer";

const rolesOf = async (client: PrismaClient) =>
  (
    await client.$queryRaw<{ role: string }[]>`
      SELECT unnest(enum_range(NULL::auth."Role"))::TEXT AS role
    `
  ).map(({ role }) => role);

/** The columns of a laura table, sorted, and its primary key's columns, sorted. */
const lauraShapeOf = async (client: PrismaClient, table: string) => {
  const columns = await client.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'laura' AND table_name = ${table}
    ORDER BY column_name
  `;
  const key = await client.$queryRaw<{ attname: string }[]>`
    SELECT a.attname FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = ('laura."' || ${table} || '"')::regclass AND i.indisprimary
    ORDER BY a.attname
  `;
  return {
    columns: columns.map(({ column_name }) => column_name),
    key: key.map(({ attname }) => attname),
  };
};

/** Every changeset above the baseline, so the rollback test survives new ones. */
const CHANGESETS_AFTER_BASELINE =
  readdirSync(CHANGESET.DIR).filter((file) => PATTERN.CHANGESET.FILE.test(file))
    .length - 1;

describe("changelog on an empty database", () => {
  const database = throwawayName("changelog_fresh");
  const url = throwawayUrl(database);
  let client: PrismaClient;

  beforeAll(async () => {
    await recreateDatabase(database);
    client = clientFor(url);
    liquibase(url, "update");
  }, TEST_DATABASE.TIMEOUT.DOCKER_MS);

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
      INSERT INTO image."Image" (id, key, width, height, bytes, "blurDataUrl", alt, "updatedAt")
      VALUES ('placed', 'placed.avif', 1, 1, 1, '', '{}', now())
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
    // Private as a whole until made public (ADR 0027).
    expect(
      await client.$queryRaw<{ access: string }[]>`
        SELECT access::text FROM image."Image" WHERE id = 'placed'
      `
    ).toEqual([{ access: "private" }]);
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

  it.each([
    [
      "Favorite",
      { columns: ["app", "createdAt", "imageId"], key: ["imageId"] },
    ],
    [
      "Profile",
      { columns: ["app", "createdAt", "userId"], key: ["app", "userId"] },
    ],
    [
      "ProfileFavorite",
      {
        columns: ["app", "createdAt", "imageId", "userId"],
        key: ["imageId", "userId"],
      },
    ],
  ])(
    "shapes laura.%s: its columns and its primary key",
    async (table, shape) => {
      expect(await lauraShapeOf(client, table)).toEqual(shape);
    }
  );

  it(
    "drops the Favorite and Profile tables when 0009 and 0010 are rolled back, the last test here",
    async () => {
      liquibase(url, "rollback-count", "--count=2");
      expect(await tablesIn(client, "laura")).toEqual(["GameScore"]);
    },
    TEST_DATABASE.TIMEOUT.DOCKER_MS
  );
});

describe("changelog on a database that already has the tables", () => {
  // Production and every existing local database: built by prisma db push.
  const database = throwawayName("changelog_existing");
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
  }, TEST_DATABASE.TIMEOUT.DOCKER_MS);

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
    // 0008 turns Laura's Viewer into a User; the three rows pin that none is lost.
    expect(rows).toEqual([
      { app: "laura", role: "USER", userId: EXISTING_USER },
      { app: "back-office", role: "USER", userId: EXISTING_USER },
      { app: "laura", role: "USER", userId: LAURA_VIEWER },
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
  const database = throwawayName("changelog_rollback");
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
  }, TEST_DATABASE.TIMEOUT.DOCKER_MS);

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
    TEST_DATABASE.TIMEOUT.DOCKER_MS
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
    TEST_DATABASE.TIMEOUT.DOCKER_MS
  );
});

describe("moving Laura's Viewers to Users", () => {
  const database = throwawayName("changelog_viewers");
  const url = throwawayUrl(database);
  let client: PrismaClient;

  beforeAll(async () => {
    await recreateDatabase(database);
    client = clientFor(url);
  }, TEST_DATABASE.TIMEOUT.DOCKER_MS);

  afterAll(async () => {
    await client.$disconnect();
    await dropDatabase(database);
  });

  it(
    "turns Laura's Viewers into Users and leaves every other Membership and the Role alone",
    async () => {
      liquibase(url, "update");
      // The move does nothing on rollback: that puts the database before it.
      liquibase(
        url,
        "rollback-count",
        `--count=${CHANGESETS_FROM_LAURA_VIEWERS}`
      );
      await client.$executeRaw`
        INSERT INTO auth."User" (id, email, "updatedAt") VALUES
          (${LAURA_VIEWER_MEMBER}, 'a@allonfire.test', now()),
          (${LAURA_ADMIN_MEMBER}, 'b@allonfire.test', now()),
          (${BACK_OFFICE_VIEWER_MEMBER}, 'c@allonfire.test', now())
      `;
      await client.$executeRaw`
        INSERT INTO auth."Membership" ("userId", app, role) VALUES
          (${LAURA_VIEWER_MEMBER}, 'laura', 'VIEWER'),
          (${LAURA_ADMIN_MEMBER}, 'laura', 'ADMIN'),
          (${BACK_OFFICE_VIEWER_MEMBER}, 'back-office', 'VIEWER')
      `;
      liquibase(url, "update");
      const rows = await client.$queryRaw<
        { userId: string; app: string; role: string }[]
      >`
        SELECT "userId", app::TEXT AS app, role::TEXT AS role
        FROM auth."Membership" ORDER BY "userId"
      `;
      expect(rows).toEqual([
        { app: "laura", role: "USER", userId: LAURA_VIEWER_MEMBER },
        { app: "laura", role: "ADMIN", userId: LAURA_ADMIN_MEMBER },
        {
          app: "back-office",
          role: "VIEWER",
          userId: BACK_OFFICE_VIEWER_MEMBER,
        },
      ]);
      expect(await rolesOf(client)).toEqual(["ADMIN", "USER", "VIEWER"]);
    },
    TEST_DATABASE.TIMEOUT.DOCKER_MS
  );
});

const MEMORY_SCORE_USER = "memory-score-user";
const MEMORY_SCORE_OUTSIDER = "memory-score-outsider";
const MEMORY_SCORE_IMAGE = "memory-score-image";
const SCORE_IDS = {
  KEPT: "score-kept",
  NO_MEMBERSHIP: "score-no-membership",
  NO_SCORE: "score-no-moves",
  NO_TIME: "score-no-time",
  QUIZ: "score-quiz",
  TOO_FEW: "score-too-few",
};
const MEMORY_SCORE_MOVES = 8;
const MEMORY_SCORE_TIME_MS = 40_000;

describe("making Laura's scores Memory's", () => {
  const database = throwawayName("changelog_memory_score");
  const url = throwawayUrl(database);
  let client: PrismaClient;

  beforeAll(async () => {
    await recreateDatabase(database);
    client = clientFor(url);
    liquibase(url, "update");
    // Back to the database before the changeset, then the old shape's rows.
    liquibase(url, "rollback-count", "--count=1");
    await client.$executeRaw`
      INSERT INTO auth."User" (id, email, "updatedAt") VALUES
        (${MEMORY_SCORE_USER}, 'scorer@allonfire.test', now()),
        (${MEMORY_SCORE_OUTSIDER}, 'outsider@allonfire.test', now())
    `;
    await client.$executeRaw`
      INSERT INTO auth."Membership" ("userId", app, role)
      VALUES (${MEMORY_SCORE_USER}, 'laura', 'USER')
    `;
    await client.$executeRaw`
      INSERT INTO image."Image" (id, key, width, height, bytes, "blurDataUrl", alt, "updatedAt")
      VALUES (${MEMORY_SCORE_IMAGE}, 'memory-score.avif', 1, 1, 1, '', '{}', now())
    `;
    await client.$executeRaw`
      INSERT INTO image."ImageApp" ("imageId", app) VALUES (${MEMORY_SCORE_IMAGE}, 'laura')
    `;
    await client.$executeRaw`
      INSERT INTO laura."Favorite" ("imageId") VALUES (${MEMORY_SCORE_IMAGE})
    `;
    await client.$executeRaw`
      INSERT INTO laura."GameScore" (id, "userId", "gameType", score, "timeMs") VALUES
        (${SCORE_IDS.KEPT}, ${MEMORY_SCORE_USER}, 'MEMORY', ${MEMORY_SCORE_MOVES}, ${MEMORY_SCORE_TIME_MS}),
        (${SCORE_IDS.QUIZ}, ${MEMORY_SCORE_USER}, 'QUIZ', 9, 30000),
        (${SCORE_IDS.NO_TIME}, ${MEMORY_SCORE_USER}, 'MEMORY', 9, NULL),
        (${SCORE_IDS.NO_SCORE}, ${MEMORY_SCORE_USER}, 'MEMORY', NULL, 30000),
        (${SCORE_IDS.TOO_FEW}, ${MEMORY_SCORE_USER}, 'MEMORY', 3, 30000),
        (${SCORE_IDS.NO_MEMBERSHIP}, ${MEMORY_SCORE_OUTSIDER}, 'MEMORY', 8, 40000)
    `;
    liquibase(url, "update");
  }, TEST_DATABASE.TIMEOUT.DOCKER_MS);

  afterAll(async () => {
    await client.$disconnect();
    await dropDatabase(database);
  });

  const scoreIds = async () =>
    (
      await client.$queryRaw<{ id: string }[]>`
        SELECT id FROM laura."MemoryScore" ORDER BY id
      `
    ).map(({ id }) => id);

  it("renames the table and has no GameScore left", async () => {
    expect(await tablesIn(client, "laura")).toEqual(LAURA_TABLES);
  });

  it("keeps a Member's Memory game and removes what no player could have produced", async () => {
    expect(await scoreIds()).toEqual([SCORE_IDS.KEPT]);
  });

  it("lists exactly the Memory columns", async () => {
    expect((await lauraShapeOf(client, "MemoryScore")).columns).toEqual([
      "app",
      "createdAt",
      "id",
      "score",
      "timeMs",
      "userId",
    ]);
  });

  it("has no GameType", async () => {
    const types = await client.$queryRaw<{ typname: string }[]>`
      SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'laura' AND t.typname = 'GameType'
    `;
    expect(types).toEqual([]);
  });

  it("gives the scorer a Profile with the master Favorites copied", async () => {
    const copies = await client.$queryRaw<{ imageId: string }[]>`
      SELECT "imageId" FROM laura."ProfileFavorite" WHERE "userId" = ${MEMORY_SCORE_USER}
    `;
    expect(copies).toEqual([{ imageId: MEMORY_SCORE_IMAGE }]);
  });

  it("makes no Profile for someone with no Laura Membership", async () => {
    const profiles = await client.$queryRaw<{ userId: string }[]>`
      SELECT "userId" FROM laura."Profile" WHERE "userId" = ${MEMORY_SCORE_OUTSIDER}
    `;
    expect(profiles).toEqual([]);
  });

  it("refuses a game no player can produce", async () => {
    await expect(
      client.$executeRaw`
        INSERT INTO laura."MemoryScore" (id, "userId", score, "timeMs")
        VALUES ('too-few-moves', ${MEMORY_SCORE_USER}, 5, 40000)
      `
    ).rejects.toThrow();
  });

  it("refuses a score for a pair with no Profile", async () => {
    await expect(
      client.$executeRaw`
        INSERT INTO laura."MemoryScore" (id, "userId", score, "timeMs")
        VALUES ('no-profile', ${MEMORY_SCORE_OUTSIDER}, 8, 40000)
      `
    ).rejects.toThrow();
  });

  it("has no foreign key from MemoryScore to auth.User", async () => {
    const keys = await client.$queryRaw<{ target: string }[]>`
      SELECT confrelid::regclass::TEXT AS target FROM pg_constraint
      WHERE conrelid = 'laura."MemoryScore"'::regclass AND contype = 'f'
    `;
    expect(keys).toEqual([{ target: 'laura."Profile"' }]);
  });

  it("removes a Member's scores with their Membership", async () => {
    await client.$executeRaw`
      DELETE FROM auth."Membership" WHERE "userId" = ${MEMORY_SCORE_USER}
    `;
    expect(await scoreIds()).toEqual([]);
  });

  it(
    "restores the old shape on rollback, every surviving row a MEMORY game",
    async () => {
      await client.$executeRaw`
        INSERT INTO auth."Membership" ("userId", app, role)
        VALUES (${MEMORY_SCORE_USER}, 'laura', 'USER')
      `;
      await client.$executeRaw`
        INSERT INTO laura."Profile" ("userId") VALUES (${MEMORY_SCORE_USER})
      `;
      await client.$executeRaw`
        INSERT INTO laura."MemoryScore" (id, "userId", score, "timeMs")
        VALUES ('survivor', ${MEMORY_SCORE_USER}, 8, 40000)
      `;
      liquibase(url, "rollback-count", "--count=1");
      const rows = await client.$queryRaw<{ gameType: string; id: string }[]>`
        SELECT id, "gameType"::TEXT AS "gameType" FROM laura."GameScore"
      `;
      expect(rows).toEqual([{ gameType: "MEMORY", id: "survivor" }]);
      liquibase(url, "update");
      expect(await scoreIds()).toEqual(["survivor"]);
    },
    TEST_DATABASE.TIMEOUT.DOCKER_MS
  );
});

const { version } = parseJsonWith(
  readFileSync(resolve(REPO.ROOT, "package.json"), "utf8"),
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
  const database = throwawayName("changelog_deploy");
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
    TEST_DATABASE.TIMEOUT.DOCKER_MS
  );

  it(
    "leaves the tag alone when nothing is pending",
    async () => {
      // Tagging again would rewrite the newest row and erase the release tag.
      liquibase(url, "deploy");
      expect(await tags(client)).toEqual([RELEASE_TAG]);
    },
    TEST_DATABASE.TIMEOUT.DOCKER_MS
  );
});
