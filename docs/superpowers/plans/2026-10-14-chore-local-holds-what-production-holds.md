# Local Holds What Production Holds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The seed writes only the real Admin and Local storage gets only the Sign in photo, so the Local database and `image` bucket hold what Production holds; then the old seed's leftovers are removed once.

**Status:** implemented (uncommitted) @ 2026-10-14T10:58:54Z

**Architecture:** `seed()` loses its mode and its App-seed hook: it upserts the Admin (Admin in every App) and nothing else; `seedFixtures` keeps its one caller, the Test template. `dev:setup` runs the same `setupImageBucket` Production's `storage-setup` runs instead of uploading every Image Fixture. A last task cleans the Local data the old seed wrote.

**Tech Stack:** TypeScript, Prisma 7, Better Auth (`hashPassword`), t3 env + zod, Vitest 4 (globals), AWS SDK S3 against MinIO, Docker.

**Spec:** `docs/superpowers/specs/2026-10-14-local-dev-cleanup-design.md`

## Global Constraints

- Never commit (iso-write); leave every change in the working tree.
- No `as` casts (tests too; `as const` allowed). No `biome-ignore`, no `oxlint-disable`.
- Use `objectValues`/`objectKeys`/`objectEntries`/`objectFromEntries` from `@allonfire/core/shared/utils/object`, never `Object.*`.
- Every test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- Integration tests never touch the Local database; they run on the package's Test database / Test bucket.
- No schema change, no changeset.
- The one-time cleanup touches Local only (`allonfire-postgres`, `allonfire-minio`). Never the VPS.
- Other sessions share this checkout: re-read a file before editing it, never revert changes this run did not make.
- Env var names start with their owner (`DATABASE_SEED_ADMIN_*`).
- Docs in plain English; no "may"/"might" for permission.

## Review Focus

- A Test database already holds the Fixtures, so a seed test that counts Users absolutely passes or fails for the wrong reason: it measures what `seed()` adds (Task 1 tests diff before/after).
- An Admin seeded with a Membership missing in one App: pinned by the Membership assertion against `objectValues(App)` (Task 1).
- `image:setup` uploading more than the Sign in photo into the Local bucket: pinned by the "holds only the shipped Images" test (Task 2).
- A `.env` still carrying `DATABASE_SEED_MODE` or `DATABASE_SEED_LAURA_VIEWER_*`: t3 env ignores unknown keys, so `pnpm db:seed` keeps working; checked by running it in Task 4.
- The cleanup deleting the Admin: the `DELETE` keeps `DATABASE_SEED_ADMIN_EMAIL`, and Task 4 reseeds before checking counts.

---

### Task 1: The seed writes only the Admin

**Files:**
- Modify: `packages/database/src/features/seed/seed.ts`
- Modify: `packages/database/src/features/seed/seed-user.ts`
- Modify: `packages/database/src/features/seed/cli.ts`
- Modify: `packages/database/src/environment/seed-environment.ts`
- Modify: `packages/database/.env.example`
- Delete: `packages/database/src/features/apps/seeds.ts`
- Delete: `packages/database/src/features/apps/laura/seed/laura-seed.ts` (and the empty `seed/` folder)
- Rewrite: `packages/database/src/features/seed/tests/seed.integration.test.ts`
- Create: `packages/database/src/features/seed/fixtures/tests/seed-fixtures.integration.test.ts`

**Interfaces:**
- Consumes: `upsertUser(client, user, hash)` (`upsert-user.ts`), `adminSeedUser(email, name)` (`seed-user.ts`), `seedFixtures(client)` (`fixtures/seed-fixtures.ts`).
- Produces: `seed(client: PrismaClient, settings: SeedSettings): Promise<void>` where `SeedSettings = Pick<SeedEnv, "DATABASE_SEED_ADMIN_EMAIL" | "DATABASE_SEED_ADMIN_NAME" | "DATABASE_SEED_ADMIN_PASSWORD">`. `AppSeed` no longer exists.

- [x] **Step 1: Move the Fixture tests next to `seedFixtures`**

They test `seedFixtures`, which the seed stops calling. Create `packages/database/src/features/seed/fixtures/tests/seed-fixtures.integration.test.ts`:

```ts
// @module-tag integration
import { prisma } from "../../../prisma/client";
import { FIXTURE } from "../fixtures";
import { seedFixtures } from "../seed-fixtures";

describe("seedFixtures", () => {
  it("holds every Fixture User, and a second run changes nothing", async () => {
    await seedFixtures(prisma);
    const before = await prisma.user.count();
    await seedFixtures(prisma);
    expect(await prisma.user.count()).toBe(before);
    const emails = (
      await prisma.user.findMany({ select: { email: true } })
    ).map(({ email }) => email);
    expect(emails).toEqual(
      expect.arrayContaining(FIXTURE.USERS.map(({ email }) => email))
    );
  });

  it("brings a changed Image Fixture row back to the Fixture", async () => {
    const { alt, key, width } = FIXTURE.IMAGE.PUBLIC_IN_BACK_OFFICE;
    await prisma.image.update({
      data: { alt: { en: "stale", it: "vecchio" }, width: 1 },
      where: { key },
    });
    await seedFixtures(prisma);
    expect(
      await prisma.image.findUniqueOrThrow({
        select: { alt: true, width: true },
        where: { key },
      })
    ).toEqual({ alt, width });
  });
});
```

- [x] **Step 2: Rewrite the seed test for the Admin-only seed**

Replace `packages/database/src/features/seed/tests/seed.integration.test.ts` with:

```ts
// @module-tag integration
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import { seed } from "../seed";

const ADMIN = {
  DATABASE_SEED_ADMIN_EMAIL: "seed-admin@allonfire.test",
  DATABASE_SEED_ADMIN_PASSWORD: "seed-admin-password",
} as const;
const KEEP = "keep-me@allonfire.test";

const emails = async () =>
  (await prisma.user.findMany({ select: { email: true } })).map(
    ({ email }) => email
  );
const counts = async () => ({
  images: await prisma.image.count(),
  memberships: await prisma.membership.count(),
  users: await prisma.user.count(),
});

// The Test database already holds every Fixture: the tests measure what the
// seed adds, never absolute counts.
beforeEach(async () => {
  await prisma.user.deleteMany({
    where: { email: ADMIN.DATABASE_SEED_ADMIN_EMAIL },
  });
});

describe("the seed", () => {
  it("adds the Admin and nobody else, Admin in every App", async () => {
    const before = await emails();
    await seed(prisma, ADMIN);
    expect((await emails()).filter((email) => !before.includes(email))).toEqual(
      [ADMIN.DATABASE_SEED_ADMIN_EMAIL]
    );
    const { memberships } = await prisma.user.findUniqueOrThrow({
      select: { memberships: { select: { app: true, role: true } } },
      where: { email: ADMIN.DATABASE_SEED_ADMIN_EMAIL },
    });
    expect(memberships).toHaveLength(objectValues(App).length);
    expect(memberships).toEqual(
      expect.arrayContaining(
        objectValues(App).map((app) => ({ app, role: Role.ADMIN }))
      )
    );
  });

  it("adds no Image row", async () => {
    const before = await prisma.image.count();
    await seed(prisma, ADMIN);
    expect(await prisma.image.count()).toBe(before);
  });

  it("changes nothing on a second run", async () => {
    await seed(prisma, ADMIN);
    const before = await counts();
    await seed(prisma, ADMIN);
    expect(await counts()).toEqual(before);
  });

  it("deletes nobody: a User it does not seed stays", async () => {
    await prisma.user.upsert({
      create: { email: KEEP, emailVerified: true, name: "keep" },
      update: {},
      where: { email: KEEP },
    });
    await seed(prisma, ADMIN);
    expect(
      await prisma.user.findUnique({ where: { email: KEEP } })
    ).not.toBeNull();
  });

  it("prints nothing: a CLI that seeds hands its stdout to a shell", async () => {
    const printed = vi.spyOn(console, "log");
    await seed(prisma, ADMIN);
    expect(printed).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 3: Run it to verify it fails**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/seed/tests/seed.integration.test.ts src/features/seed/fixtures/tests/seed-fixtures.integration.test.ts`
(Docker running; `pnpm docker:up` first if not.)
Expected: the `seed` tests FAIL (`hashPassword` of the missing `DATABASE_SEED_LAURA_VIEWER_PASSWORD` throws); the two `seedFixtures` tests PASS.

- [x] **Step 4: Make the seed Admin-only**

`packages/database/src/environment/seed-environment.ts`, the `server` block becomes:

```ts
  server: {
    // Required: the real Admin, Admin in every App
    DATABASE_SEED_ADMIN_EMAIL: z.email(),
    DATABASE_SEED_ADMIN_NAME: z.string().min(1).optional(),
    DATABASE_SEED_ADMIN_PASSWORD: z.string().min(8),
  },
```

`packages/database/src/features/seed/seed-user.ts`: `SeedSettings` becomes

```ts
/** What the seed reads from its env. */
export type SeedSettings = Pick<
  SeedEnv,
  | "DATABASE_SEED_ADMIN_EMAIL"
  | "DATABASE_SEED_ADMIN_NAME"
  | "DATABASE_SEED_ADMIN_PASSWORD"
>;
```

and the `AppSeed` type with its doc comment is deleted. `SeedUser` and `adminSeedUser` stay.

`packages/database/src/features/seed/seed.ts` becomes:

```ts
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "../../../generated/prisma/client";
import { adminSeedUser, type SeedSettings } from "./seed-user";
import { upsertUser } from "./upsert-user";

/**
 * The real Admin, Admin in every App: what Local and Production both hold.
 * The Fixtures go only into the Test template (`seedFixtures`). It deletes
 * nobody.
 */
export async function seed(client: PrismaClient, settings: SeedSettings) {
  const adminName =
    settings.DATABASE_SEED_ADMIN_NAME ??
    settings.DATABASE_SEED_ADMIN_EMAIL.split("@")[0] ??
    "Admin";
  await upsertUser(
    client,
    adminSeedUser(settings.DATABASE_SEED_ADMIN_EMAIL, adminName),
    await hashPassword(settings.DATABASE_SEED_ADMIN_PASSWORD)
  );
}
```

`packages/database/src/features/seed/cli.ts` line 8 becomes `  console.log("Seeded");`.

Delete `packages/database/src/features/apps/seeds.ts` and `packages/database/src/features/apps/laura/seed/laura-seed.ts` (remove the then-empty `laura/seed/` folder, and any `._*` sidecars in it).

`packages/database/.env.example` becomes:

```
DATABASE_URL="postgresql://allonfire:allonfire@localhost:5432/allonfire"

# Required: the real Admin, Admin in every App. Local and Production seed the
# same; the Fixtures live only in Test databases.
DATABASE_SEED_ADMIN_EMAIL="admin@example.com"
DATABASE_SEED_ADMIN_PASSWORD="changeme123"
# DATABASE_SEED_ADMIN_NAME="Admin"
```

- [x] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/seed`
Expected: PASS, all files. The template fingerprint covers `src/features/seed/`, so the first run builds a new template (Liquibase in Docker, about a minute).

- [x] **Step 6: Types and leftovers**

Run: `pnpm --filter @allonfire/database check-types`
Expected: exit 0.
Run: `git grep -n -E "DATABASE_SEED_MODE|DATABASE_SEED_LAURA|APP_SEEDS|AppSeed|lauraSeed" -- packages apps ':!**/._*'`
Expected: no output.

---

### Task 2: Local storage gets only the shipped Images

**Files:**
- Modify: `packages/storage/package.json` (scripts)
- Modify: `package.json` (root `dev:setup`)
- Modify: `packages/storage/src/features/image/fixtures/upload-fixtures.ts` (drop `uploadImageFixtures`)
- Delete: `packages/storage/src/features/image/fixtures/seed-local.ts`
- Modify: `packages/storage/src/features/image/setup/cli.ts` (comment)
- Modify: `packages/storage/.env.example` (comment)
- Test: `packages/storage/src/features/image/setup/tests/setup-bucket.integration.test.ts`

**Interfaces:**
- Consumes: `setupImageBucket(bucket, images = SHIPPED_IMAGES)` (`setup/setup-bucket.ts`), `putFixtureImage(bucket, fixture)` (stays).
- Produces: script `pnpm --filter @allonfire/storage image:setup`; `uploadImageFixtures` no longer exists.

- [x] **Step 1: Write the failing test**

In `setup-bucket.integration.test.ts`, add `ListObjectsV2Command` to the `@aws-sdk/client-s3` import and this test inside the `describe`, after the first `it`:

```ts
  it("holds only the shipped Images: the sign-in photo, no other Fixture", async () => {
    await setupImageBucket(bucket);
    const { Contents = [] } = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket })
    );
    expect(Contents.map(({ Key }) => Key)).toEqual([key]);
  });
```

- [x] **Step 2: Run it**

Run: `pnpm --filter @allonfire/storage exec vitest run src/features/image/setup`
Expected: PASS already (the default is `SHIPPED_IMAGES`). This test pins that default, which `image:setup` now relies on for Local; it guards the change, it does not drive it.

- [x] **Step 3: Replace `db:seed:images` with `image:setup`**

`packages/storage/package.json` scripts: delete `"db:seed:images"` and add, keeping alphabetical order:

```json
    "image:setup": "tsx --env-file-if-exists=.env src/features/image/setup/cli.ts",
```

Root `package.json`, `dev:setup` becomes:

```json
    "dev:setup": "pnpm docker:up && pnpm db:generate && pnpm db:update && pnpm db:seed && pnpm --filter @allonfire/storage image:setup",
```

`packages/storage/src/features/image/setup/cli.ts` header comment becomes:

```ts
// The Images' bucket, its policy and the shipped Images: the deploy's
// `storage-setup` service (docker/docker-compose.prod.yml) before the API
// starts, and `pnpm --filter @allonfire/storage image:setup` (dev:setup) for
// the Local bucket.
```

Delete `packages/storage/src/features/image/fixtures/seed-local.ts`. In `upload-fixtures.ts` delete `uploadImageFixtures` with its doc comment and the now-unused `objectValues` and `FIXTURE` imports (keep what `putFixtureImage` uses).

`packages/storage/.env.example` first two lines become:

```
# Local MinIO as `pnpm docker:up` starts it; read by `image:setup` and
# `test-bucket`. Copy to `.env`. Vitest sets the same values itself.
```

- [x] **Step 4: Verify**

Run: `pnpm --filter @allonfire/storage check-types && pnpm --filter @allonfire/storage exec vitest run src/features/image`
Expected: exit 0, PASS.
Run: `git grep -n -E "db:seed:images|seed-local|uploadImageFixtures" -- packages apps package.json ':!**/._*'`
Expected: only Markdown hits (fixed in Task 3).

---

### Task 3: Docs say Local holds what Production holds

**Files:**
- Modify: `CLAUDE.md` (Database Schema Quick Reference paragraph at "Schema folder:"; env naming example listing `DATABASE_SEED_MODE`)
- Modify: `README.md` (`### 💻 Local` section)
- Modify: `packages/database/README.md` (`pnpm db:seed` row; layout tree lines for `apps/` and `seed/`)
- Modify: `packages/storage/README.md` (`upload-fixtures` export row; layout `fixtures/` line; Test buckets paragraph; env paragraph)

- [x] **Step 1: `CLAUDE.md`**

In the "Schema folder:" paragraph replace from `An App's services and seed live in` to the end of that paragraph with:

```
An App's services live in `src/features/apps/<app>/`. The seed (`src/features/seed/`, `pnpm db:seed`) writes only the real Admin (`DATABASE_SEED_ADMIN_*`), Admin in every App: Local holds what Production holds. The Fixtures (`src/features/seed/fixtures/`: `FIXTURE.USER`, `FIXTURE.PASSWORD`, `FIXTURE.IMAGE`) go only into the Test template; `pnpm --filter @allonfire/storage image:setup` gives the Local `image` bucket what Production's `storage-setup` gives it (the sign-in photo).
```

In the env naming paragraph replace `` `DATABASE_SEED_MODE`, `` with `` `DATABASE_SEED_ADMIN_EMAIL`, ``.

- [x] **Step 2: `README.md` Local section**

Replace the paragraph under `### 💻 Local` with:

```
`pnpm dev:setup` starts the Local stack, applies the changelog, seeds the
real Admin (`DATABASE_SEED_ADMIN_*` in `packages/database/.env`, Admin in
every App) and puts the sign-in photo in the `image` bucket: Local holds
what Production holds. The Fixtures live only in Test databases; a `.env`
from before drops `DATABASE_SEED_MODE` and `DATABASE_SEED_LAURA_VIEWER_*`.
`packages/storage/.env` (from its `.env.example`) holds the Local MinIO
login the setup and the e2e run's bucket use.
```

- [x] **Step 3: `packages/database/README.md`**

`pnpm db:seed` row description becomes: `Seed the real Admin, Admin in every App; the Fixtures go only into the Test template`.

Layout tree: the `apps/` line becomes `apps/                 one folder per App`; the `laura/` line becomes `laura/              game-score.service`; the `seed/` line's `seed-user.ts (AppSeed),` becomes `seed-user.ts,`.

- [x] **Step 4: `packages/storage/README.md`**

- Export row `./features/image/fixtures/upload-fixtures`: description becomes `` `putFixtureImage(bucket, fixture)`: one Image Fixture's file through `prepareImage`, under its key ``.
- Layout: `fixtures/` lines become `files/ (the Image Fixtures' sources), upload-fixtures,` / `scripts/describe-fixtures`; the `setup/` line becomes `setupImageBucket: bucket, policy, shipped Images (pnpm image:setup)`.
- Test buckets paragraph: replace the sentence starting `` `pnpm --filter @allonfire/storage db:seed:images` uploads `` with `` The Local `image` bucket holds only the shipped Images: `pnpm --filter @allonfire/storage image:setup`, part of `pnpm dev:setup`, runs the setup Production runs. ``
- Env paragraph: `` `db:seed:images` `` becomes `` `image:setup` ``.

- [x] **Step 5: Verify**

Run: `git grep -n -E "DATABASE_SEED_MODE|DATABASE_SEED_LAURA|db:seed:images|seed-local|uploadImageFixtures|AppSeed|APP_SEEDS" -- ':!docs/superpowers' ':!**/._*'`
Expected: only the README.md migration note (`drops DATABASE_SEED_MODE and DATABASE_SEED_LAURA_VIEWER_*`).
Run: `pnpm biome check --write $(git diff --name-only -- '*.ts' '*.json' | grep -v '/\._')` then `pnpm lint && pnpm turbo run check-types test --filter=@allonfire/database --filter=@allonfire/storage --filter=@allonfire/api`
Expected: exit 0.

---

### Task 4: One-time Local cleanup

Local only. Every command targets `allonfire-postgres` / `allonfire-minio` / Local Docker; nothing here reaches the VPS.

**Files:** none (data only).

- [x] **Step 1: Snapshot what is there**

```bash
U=$(docker exec allonfire-postgres printenv POSTGRES_USER)
PSQL="docker exec -i allonfire-postgres psql -U $U -d allonfire -v ON_ERROR_STOP=1"
ADMIN=$(grep '^DATABASE_SEED_ADMIN_EMAIL' packages/database/.env | cut -d= -f2 | tr -d '"')
$PSQL -c 'select email from auth."User" order by email;'
$PSQL -c 'select count(*) images from image."Image"; select count(*) sessions from auth."Session";'
docker exec allonfire-minio sh -c 'mc alias set l http://localhost:9000 allonfire allonfire >/dev/null && mc ls l/image'
```

Expected: the Admin plus the 8 `*@allonfire.test` Fixtures and `laura-viewer@allonfire.com`; 6 Image rows; Sessions; 6 objects in `image`. If `$ADMIN` is empty, stop: the `.env` has no Admin.

- [x] **Step 2: Delete what the seed no longer writes**

```bash
$PSQL -v admin="$ADMIN" <<'SQL'
BEGIN;
DELETE FROM auth."User" WHERE email <> :'admin';
DELETE FROM image."Image";
DELETE FROM auth."Session";
COMMIT;
SQL
```

Memberships, Accounts and Sessions of the deleted Users cascade; `ImageApp` cascades from `Image`.

- [x] **Step 3: Remove the Fixture files, keep the sign-in photo**

```bash
docker exec allonfire-minio sh -c 'mc alias set l http://localhost:9000 allonfire allonfire >/dev/null && for k in 8ce86b0f-3bdd-4489-adf7-bb8faf63adc1 e15a4a0b-80fc-4609-abac-f948461ba3da 36699d92-f075-4320-a9da-3b96e19f3d44 2e8b75aa-a1fe-42f5-88f3-220ddbbd1d18 a0ee02c3-9a8d-4950-a4ae-5974d3a7a1ec; do mc rm "l/image/$k.avif"; done'
```

These are the keys of `FIXTURE.IMAGE` other than `SIGN_IN` (`507f5c8a-c98e-44ae-a9be-287b3ea0c4ff.avif`), from `packages/database/src/features/seed/fixtures/images.ts`; re-check them there before running.

- [x] **Step 4: Reseed the way `dev:setup` does, and check**

```bash
pnpm db:seed && pnpm --filter @allonfire/storage image:setup
$PSQL -c 'select u.email, m.app, m.role from auth."User" u join auth."Membership" m on m."userId" = u.id order by m.app;'
$PSQL -c 'select (select count(*) from auth."User") users, (select count(*) from image."Image") images, (select count(*) from auth."Session") sessions;'
docker exec allonfire-minio sh -c 'mc alias set l http://localhost:9000 allonfire allonfire >/dev/null && mc ls l/image'
```

Expected: `pnpm db:seed` prints `Seeded` (also with the user's `.env` still holding `DATABASE_SEED_MODE`); one row per App, all `ADMIN`, for `$ADMIN`; `users 1, images 0, sessions 0`; one object, `507f5c8a-c98e-44ae-a9be-287b3ea0c4ff.avif`. Open `http://localhost:3400/en/sign-in` (the user's `pnpm dev`; never start or stop it) and confirm the photo shows.

- [x] **Step 5: Docker leftovers**

```bash
docker ps -a --filter name=^monorepoonfire$ --format '{{.Names}} {{.Status}}'
docker volume ls --filter name=^api_ --format '{{.Name}}'
```

Expected: container `monorepoonfire`, volumes `api_postgres_data`, `api_redis_data`. Then:

```bash
docker rm monorepoonfire
docker volume rm api_postgres_data api_redis_data
```

If `docker rm` refuses because the container is running, stop and ask the user; never `-f`. Leave every other container and volume alone (the unlabelled dangling volumes, `carlo`, `ai-agent-*`).

- [x] **Step 6: Tell the user**

Report the counts from Step 4 and that their `packages/database/.env` still holds `DATABASE_SEED_MODE`: they delete that line; nothing reads it. They sign in to the Back Office once more (Step 2 removed every Session).

## Implementation Log
- Implemented: 2026-10-14T10:58:54Z
- Workspace: current-branch — feat/back-office-special-pages
- Committed: no — awaiting user review
