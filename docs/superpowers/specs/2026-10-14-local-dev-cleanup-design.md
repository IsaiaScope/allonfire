# Local Holds What Production Holds

Date: 2026-10-14

## Goal

The Local stack (Postgres `allonfire`, MinIO `image`) holds only what the Apps
read: the real Admin and the Sign in photo. No Fixture User, no Fixture Image,
no seeded Laura Viewer, no row or file nothing reads. The seed produces exactly that,
so the noise never comes back after a `pnpm dev:setup` or a `pnpm db:seed`.

Fixtures stay where tests need them: in the Test template and every Test
database and Test bucket cloned from it. Nothing about the test layers changes.

## Decisions (agreed in chat)

- **Local seeds what Production seeds.** One seed path, no mode.
  `DATABASE_SEED_MODE` disappears.
- **The seeded Admin (`DATABASE_SEED_ADMIN_*`) is Admin in every App.** Already
  true (`adminSeedUser`, `objectValues(App)`); kept and pinned by a test.
- **Laura's seeded Viewer leaves the seed in every mode.** The user removed it
  from `packages/database/.env`. `DATABASE_SEED_LAURA_VIEWER_*`, `lauraSeed`,
  `APP_SEEDS`, `AppSeed` and `src/features/apps/seeds.ts` go: Laura was the
  only App seed, and a hook with no App behind it is a seam nothing varies
  across. It comes back with a real caller when Laura is rebuilt.
- **One-time cleanup, no reset command.** The Local data written by the old
  seed is removed once, by a plan task, after the seed change.

## 1. Seed

`seed(client, settings)` writes only the real Admin, through `upsertUser`,
with a Membership `ADMIN` in every App (Memberships rewritten each run). It
still deletes nobody and prints nothing.

- `seedEnv` keeps `DATABASE_SEED_ADMIN_EMAIL`, `DATABASE_SEED_ADMIN_NAME`
  (optional), `DATABASE_SEED_ADMIN_PASSWORD`. It drops
  `DATABASE_SEED_LAURA_VIEWER_EMAIL`, `DATABASE_SEED_LAURA_VIEWER_PASSWORD`,
  `DATABASE_SEED_MODE`.
- `SeedSettings` narrows to the three Admin keys. `AppSeed` is deleted;
  `SeedUser` and `adminSeedUser` stay (the Fixtures use `SeedUser`).
- `seed.ts` no longer calls `seedFixtures`. `seedFixtures` keeps its one
  caller, `test-database/template.ts`.
- `cli.ts` prints `Seeded` with no mode.
- Deleted: `src/features/apps/seeds.ts`,
  `src/features/apps/laura/seed/laura-seed.ts`.

## 2. Storage

`pnpm dev:setup` gets the Local `image` bucket ready the way Production's
`storage-setup` does: `setupImageBucket(env.STORAGE_BUCKET)` with its default
(`SHIPPED_IMAGES`, the Sign in photo), each only when missing.

- `packages/storage` script `image:setup` runs
  `src/features/image/setup/cli.ts` (the same file Production runs) with
  `--env-file-if-exists=.env`.
- `dev:setup` becomes `docker:up && db:generate && db:update && db:seed &&
  pnpm --filter @allonfire/storage image:setup`.
- Deleted: the `db:seed:images` script, `fixtures/seed-local.ts`, and
  `uploadImageFixtures` (its only caller was `seed-local.ts`).
  `putFixtureImage` stays: `setupImageBucket` uses it.
- `minio-init` in `docker-compose.dev.yml` is unchanged (bucket and policy at
  `docker:up`); `image:setup` repeats both harmlessly.

## 3. One-time Local cleanup

A plan task, run once against Local only (`allonfire-postgres`, MinIO at
`localhost:9000`), after the seed change:

1. `DELETE FROM auth."User"` for every email except `DATABASE_SEED_ADMIN_EMAIL`
   (today: the 8 `*@allonfire.test` Fixtures and `laura-viewer@allonfire.com`).
   Memberships, Accounts and Sessions go with them (`onDelete: Cascade`).
2. `DELETE FROM image."Image"` (all 6 rows; `ImageApp` cascades). The Sign in
   page reads the file by key, not a row.
3. `DELETE FROM auth."Session"`: every remaining Session (the Admin's 10 dev
   sign-ins). The cost is one new Back Office sign-in.
4. Remove the 5 Fixture files from MinIO `image`; keep
   `FIXTURE.IMAGE.SIGN_IN.key`.
5. `pnpm db:seed` and `pnpm --filter @allonfire/storage image:setup`, then
   check by query: 1 User, Admin Membership in every App, 0 Image rows,
   0 Sessions, 1 object in `image`.
6. Docker: remove container `monorepoonfire` and volumes `api_postgres_data`,
   `api_redis_data` (an old repo and an old compose project).

Left alone: the 13 unlabelled dangling volumes (nothing ties them to this
repo), `carlo` and `ai-agent-*` (another project), the `laura` bucket (Laura's
real photos), n8n, umami, OpenObserve, adminer, Redis (already empty).

The user deletes the `DATABASE_SEED_MODE` line from their own
`packages/database/.env`; nothing reads it after the change.

## 4. Outside the change

- The Laura App keeps its own `LAURA_VIEWER_EMAIL/PASSWORD` and the
  sign-in button. With no seeded Viewer that button fails on Local. Laura is
  paused and keeps its old env until it is rebuilt.
- Production: the VPS database is replaced wholesale by the new schema, so no
  manual deletion there. `storage-setup` already holds only the Sign in photo.
- No schema change, no changeset.
- The template fingerprint covers `src/features/seed/`, so the next test run
  builds a new template once.

## 5. Docs

`CLAUDE.md` (Database Schema Quick Reference line, env naming example),
`README.md` (Local section), `packages/database/README.md` (`db:seed` row,
layout tree), `packages/database/.env.example`, `packages/storage/README.md`
(layout, Test buckets paragraph, env paragraph), `packages/storage/.env.example`.

## 6. Testing

`seed.integration.test.ts` runs on a Test database cloned from the template,
which already holds every Fixture, so it measures what the seed adds:

- seeding adds exactly one User, the Admin, with an `ADMIN` Membership in
  every App (`objectValues(App)`);
- seeding adds no Image row;
- a second run changes nothing (User, Membership, Image counts);
- it deletes nobody, and prints nothing (kept).

The Fixture tests (`seed-fixtures`, template) keep proving Test databases get
every Fixture. `seed-user.test.ts` keeps pinning `adminSeedUser`.

Success: after the cleanup task, Local answers 1 User, 0 Image rows,
0 Sessions, 1 object in `image`; `pnpm dev:setup` on that state changes none of
those counts except Sessions after a sign-in.
