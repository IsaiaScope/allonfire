# Throwaway test databases, shared fixtures and local addresses — design

**Date:** 2026-10-09
**Status:** approved in chat

## Goal

Every test that needs Postgres or MinIO runs, locally and in CI, against its
own short-lived database and bucket built from one set of fixtures, never
against the Local database. Every sign-in and Image use case is covered on the real
stack. Test data and local addresses are each written once.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | How are Images tested "with the real Apps"? | Through the real API over HTTP, in process (`createApp` with real dependencies). The Back office side covers what exists: the sign-in photo. Image pages get e2e when they are built. |
| 2 | How small is a throwaway database? | One per package per run, and one per Playwright run. |
| 3 | Naming | `allonfire_test_<package>_<epoch>_<random>`, template `allonfire_test_template`: lowercase and underscores, never quoted, like `allonfire_changelog_*`. Buckets `allonfire-test-<package>-<epoch>-<random>` (S3 names allow no underscore). |
| 4 | Where do helpers and test data live? | In the packages that own them: `@allonfire/database` (databases, fixture Users, Image rows), `@allonfire/storage` (buckets, Image files). No new package. |
| 5 | Local seed and test data | One fixture set. The Local seed and the test template load the same fixtures; their password is a constant in the repo. Env vars stay for real accounts only. |
| 6 | Local addresses | One module in `@allonfire/config` plus a guard test over the files that cannot import it. |
| 7 | Why not insert into and remove from the Local database? | Lists would see Local data, removal must know every row a test made, a crashed run leaves rows behind, fixtures shared with the Local seed would be deleted, and parallel packages would collide. One `DROP DATABASE` avoids all of it on the same Postgres server. |
| 8 | Laura | Laura's own tests are dropped (`laura-seed.test.ts`, the Laura floor cases). Tests that use `App.LAURA` only as a second App for multi-App rules stay. Laura's schema, `game-score.service` and env-seeded guest Viewer stay. |
| 9 | "dev" or "Local"? | Local, as `CONTEXT.md` says: prose says Local database and Local seed, and `DATABASE_SEED_MODE=dev` becomes `local`. |
| 10 | The retired mock Users in a Local database | The Local seed deletes them once, by the retired email list. |
| 11 | Terms | `CONTEXT.md` gains **Test database** and **Fixture**. |

## 1. Throwaway test database (`@allonfire/database`)

New feature `packages/database/src/features/test-database/`; the helpers in
`liquibase/tests/throwaway-db.ts` move into it and the changelog tests import
them from there.

- **Template.** `ensureTemplate()` fingerprints `changelog/` and
  `src/features/seed/` (sha256 over sorted paths and contents) and keeps the
  fingerprint as the comment on `allonfire_test_template`. When it is missing
  or different: take `pg_advisory_lock` on the maintenance database, check
  again, recreate the template, run Liquibase through `scripts/liquibase.sh`
  with `DATABASE_URL` pointed at it, run `seedFixtures()`, disconnect, set the
  comment. Otherwise nothing. Packages running in parallel build it once.
- **Clone.** `createTestDatabase(package)` runs
  `CREATE DATABASE <name> TEMPLATE allonfire_test_template` and returns its URL;
  `dropTestDatabase(name)` drops it `WITH (FORCE)`.
- **Sweep.** Each setup drops `allonfire_test_*` clones whose epoch is more
  than an hour old (crashed runs), never a younger one.
- **Vitest.** An exported `globalSetup` (`@allonfire/database/features/test-database/global-setup`)
  ensures the template, clones, sets `DATABASE_URL` for the workers, and drops
  the clone on teardown. It does nothing on a run whose tag filter excludes
  `integration`, so `pnpm test:unit` needs no Docker. Each package with
  integration tests that read Postgres lists it in `vitest.config.ts`.
- **Playwright.** The e2e preset fixes the run's database name once in the
  main process (kept in `process.env` so workers and teardown read the same
  one); the API's web server command creates the clone before it starts, and
  global teardown drops it.
- **The maintenance connection** is the `postgres` database on the server
  `DATABASE_URL` names.
- **Local data.** The Local `allonfire` database is never written by a test.

## 2. Fixture Users (`@allonfire/database`)

`packages/database/src/features/seed/fixtures/`, one export per file.

- `users.ts`: `FIXTURE_USER`, one User per App per Role, generated from the
  `App` and `Role` enums, so a new App or Role gets fixtures without edits.
  Emails derive from App and Role on the reserved `.test` domain
  (`back-office-admin@allonfire.test`). Named extras: `FIXTURE_USER.ADMIN_EVERYWHERE`
  (Admin in every App) and `FIXTURE_USER.NO_MEMBERSHIP`.
- `FIXTURE_PASSWORD`: one constant. Not a secret; these Users exist only in
  Local and Test databases.
- `seedFixtures()` upserts them with the existing `upsertUser` and seeds the
  Image rows (section 3). The template and the Local seed call it.
- `DATABASE_SEED_MODE` values become `local` and `prod` (was `dev`):
  `.env.example`, the seed, `dev:setup`, CI.
- The Local seed deletes the retired mock Users once, by their email list
  (`allonfire-user@`, `allonfire-viewer@`, `laura-admin@`, `laura-user@`
  `allonfire.com`); the list goes once no Local database holds them.
- Removed: `seed/mock/users.json`, Laura's `seed/mock/users.json`,
  `DATABASE_SEED_TEST_PASSWORD`, `apps/back-office/e2e/users.ts` and its
  `.env` loading, `DATABASE_SEED_*` in Turbo's `test:e2e` and CI's e2e job,
  the hard-coded fallbacks.
- Production unchanged: the real Admin and Laura's guest Viewer come from env.
- Tests that only need a signed-in User use the fixtures and lose their inline
  `upsert` / `deleteMany`. Tests that create Users (Registration) keep unique
  emails; the throwaway database removes both.

## 3. Images on the real stack (`@allonfire/storage`, `@allonfire/database`, API)

- **Bucket from env.** `STORAGE_BUCKET` (default `image`) replaces the
  `IMAGE_BUCKET` constant in the object calls and in the `/storage/images`
  rewrite (read at build). Production keeps `image`.
- **Bucket per run.** A storage helper creates the run's bucket with the
  public-read policy `minio-init` sets, and on teardown empties and removes
  it; buckets older than an hour are swept. Exposed as a Vitest
  `globalSetup` and used by the e2e preset.
- **Image fixtures.**
  - Source files in `@allonfire/storage`: one per accepted format (`.jpg`,
    `.png`, `.webp`, `.avif`, `.heic`, the existing HEIC fixture reused) and one
    refused format (`.gif`).
  - The list (fixed key `<uuid>.avif`, source file, placements with public or
    private, alt) in `@allonfire/database`'s `seed/fixtures/images.ts`;
    `seedFixtures()` writes the rows.
  - The run's bucket setup (and the Local seed, into `image`) runs each source
    through the real `prepareImage` and puts the AVIF under its key, so stored
    objects are what production would hold.
- **Sign-in photo to AVIF.** Its source photograph becomes a fixture;
  `SIGN_IN_IMAGE` takes the new `.avif` key and the blur placeholder the
  pipeline produces. Local and Test databases get it from the seed; production needs it
  uploaded once by hand (deploy note).
- **API integration tests** (`apps/api`, `*.integration.test.ts`): `createApp`
  with the real auth, Prisma, sharp and S3 dependencies; fixture Users sign in
  through `/v1/auth`.
  - Upload: each accepted format is stored as AVIF with its width and height; a
    User, a visitor, and an uploader not Admin in every target App are refused;
    too large and the refused format answer 4xx with nothing in MinIO or the
    database.
  - List: a visitor sees public Images only; a member also the private ones in
    Apps they enter; the App filter and cursor paging.
  - Get: a private Image answers 404 to a non-member.
  - Patch: alt needs Admin in every App; placements need Admin in each App
    touched; visibility switches.
  - Delete: with `app` the placement goes and the Image stays; the last
    placement takes the row and the object; without `app`, Admin everywhere.
- **Back office e2e:** the sign-in photo loads through the rewrite from the
  run's bucket.

## 4. Sign-in use cases

On the run's database and its own Redis key prefix.

**API integration** (real Better Auth, Postgres, Redis):

- Sign-in into the Back office (floor Admin): the Admin enters; a User, a
  Viewer and the User with no Membership get 403 `APP_FORBIDDEN` and no Session
  is left. Wrong password and unknown email answer 401.
- Session: `get-session` returns the Memberships; nothing after sign-out.
- Change-password: right current password, then the new signs in and the old
  does not; wrong current password refused; other Sessions pinned to what the
  code does today.
- Registration closed for every App on the real `APP_SETTINGS`: 403
  `REGISTRATION_CLOSED`, no User. The mocked open-Registration tests stay.
- Join-app pinned to its current rules with fixture Users.
- Rate limit: the 11th sign-in in the window answers 429 from real Redis.

**Back office e2e** (production App plus API): Admin signs in and lands home;
the Session survives a reload; sign-out closes home; the User, the Viewer and
the User with no Membership each see the "cannot enter" message; a wrong
password shows its message; Italian sign-in shows translated errors. The rate
limit stays out of e2e: every test signs in from one address, so tripping it
would lock out the tests beside it.

Browser tests keep the mocked action.

## 5. Local addresses (`@allonfire/config`)

- `packages/config/local/addresses.ts`, export `@allonfire/config/local/addresses`:
  `LOCAL_PORT` (Postgres 5432, Redis 6379, MinIO 9000 and console 9001, API
  3300, API e2e 3310, Back office 3400, Back office e2e 3410, Laura 3200),
  `LOCAL_URL` derived from it (Postgres with user, password and database
  `allonfire`, Redis, MinIO, each App and the API), `TEST_API_URL`
  (`http://api.test`).
- Importers: the `vitest.setup.ts` files, the Playwright preset, the database
  and bucket helpers, and unit tests that type a fixed origin. The API's
  `DEFAULT_PORT` stays in the API; an API test checks it equals `LOCAL_PORT.API`.
- Guard test in `config`: parses `docker/docker-compose.dev.yml` (ports, default
  credentials), `.github/workflows/ci.yml` env values, every `.env.example`,
  and the `--port` in the Apps' `dev` and `start` scripts; fails naming the file
  and value that disagree. `packages/database/.env.example` moves from
  `allonfire_dev` to `allonfire`.
- READMEs and `CLAUDE.md` keep literals.

## 6. CI, hook, docs

- CI `test` job: drops `db:update` and the seed; `db:drift` runs against the
  template; gains a MinIO service for the real-Image API tests. CI `e2e` job: drops the seed steps and `DATABASE_SEED_*`.
- The pre-commit hook is unchanged: Postgres, Redis and MinIO from the Local
  stack; each run makes and removes its own database and bucket.
- `CLAUDE.md` (test layers paragraph), `packages/database/README.md`,
  `packages/storage/README.md`, `packages/config/README.md` describe the test
  database, fixtures, bucket and addresses.

## Out of scope

Back office Image pages and their e2e; Laura's tests; generating env files
from the addresses module; uploading the sign-in photo to production.
