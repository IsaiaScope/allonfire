# Database: per-App Postgres schemas, Liquibase-owned changelog

**Date:** 2026-09-24
**Status:** Approved design

## Intent

The `allonfire` database will serve several Apps through the API. Better Auth
and every Laura endpoint are moving into `apps/api` (Laura under its own
routes). Today every table lives in Postgres `public`, the Prisma schema is a
single file, the service layer is one flat barrel, and schema changes reach
production through `prisma db push` with no history and no rollback.

Success means:

- Tables are grouped by owner in Postgres schemas: `auth` (shared identity) and
  `laura`. A future App adds its own schema.
- The package code mirrors that split, so `routes/laura/` in the API can import
  Laura services and nothing else.
- Every schema change is a versioned, reviewable changeset with a rollback, and
  production can roll back any number of releases.
- Production data (photos, quiz, scores, users) survives the move untouched.

## Decisions

| Topic | Decision |
|---|---|
| Separation | Both Postgres schemas and code split |
| Schemas | `auth` (User, Session, Account, Verification, enum Role) and `laura` (Photo, Favorite, GameScore, QuizQuestion, QuizAnswer, enum GameType). `public` left empty. No `shared` schema until a table needs it |
| Table names | Unchanged (`"Photo"`, PascalCase). Only the schema moves. A rename is a separate future changeset |
| Migration tool | Liquibase 5.x (FSL licence: free for any use except a competing product; each release becomes Apache 2.0 after two years). Runs in Docker only, no Java on the host or the Mac |
| Changeset authoring | Prisma drafts, Liquibase owns. `schema.prisma` stays the source of truth for models; `prisma migrate diff` generates forward and rollback SQL into a Liquibase formatted-SQL changeset |
| Prisma client | One client for all schemas (`multiSchema`, GA since Prisma 6.13), so cross-schema relations keep working |
| Prod runner | One-shot compose services on `dokploy-network`: `db-backup` then `db-migrate` then `laura` |

Prisma Migrate is not used. `prisma migrate diff` is used only as a diff engine.

## Package layout

```
packages/database/
  prisma/schema/                 multi-file schema folder
    schema.prisma                generator + datasource, schemas = ["auth", "laura"]
    auth.prisma                  User, Session, Account, Verification, Role   @@schema("auth")
    laura.prisma                 Photo, Favorite, GameScore, QuizQuestion,
                                 QuizAnswer, GameType                         @@schema("laura")
  changelog/
    db.changelog-master.yaml     includeAll: changesets/
    changesets/
      0000-baseline.sql
      0001-auth-laura-schemas.sql
  liquibase/                     Dockerfile (+ Dockerfile.dockerignore),
                                 entrypoint.sh, jdbc-url.sh
  scripts/liquibase.sh           local wrapper: build + run the same image
  scripts/changeset.ts           pnpm db:changeset <name>
  src/
    client.ts                    prisma singleton (moved from index.ts)
    index.ts                     prisma + generated types
    env.ts
    auth/user.service.ts
    laura/photo.service.ts, favorite.service.ts, game-score.service.ts, quiz.service.ts
    seed.ts, seed-quiz.ts, seed-env.ts
```

### Exports

| Path | Content |
|---|---|
| `@allonfire/database` | `prisma`, `PrismaClient`, generated types (`Role`, `GameType`, model types) |
| `@allonfire/database/auth/user` | user services (`checkUserAppAccess`, `getUserById`, …) |
| `@allonfire/database/laura/photo`, `/laura/favorite`, `/laura/game-score`, `/laura/quiz` | one subpath per Laura service file, with its types (`PhotoWithUser`, `LeaderboardEntry`, `QuizQuestionWithAnswers`) |
| `@allonfire/database/env` | unchanged |
| `@allonfire/database/generated/prisma` | unchanged |

`./services` and `src/services/` are removed. No `export *` from the root and
no barrel per App: one explicit subpath per service file, the same pattern as
`@allonfire/auth` (`./guard`, `./server`).

### Cross-schema relations

Postgres foreign keys cross schemas (`laura."Photo"."uploadedBy"` references
`auth."User"."id"`), so cascades and integrity are unchanged. Prisma requires
back-relation fields, so `User` in `auth.prisma` still lists `photos`,
`gameScores` and `quizQuestions`. This is a known, accepted leak of Laura names
into the auth file.

## Changelog

### Format

Liquibase formatted SQL, one file per changeset:

```sql
--liquibase formatted sql
--changeset isaia:0001-auth-laura-schemas
CREATE SCHEMA auth;
...
--rollback ALTER TABLE auth."User" SET SCHEMA public;
```

`db.changelog-master.yaml` uses `includeAll` on `changesets/`, so ordering is
the zero-padded filename prefix.

### 0000-baseline

Today's `public` schema, generated with
`prisma migrate diff --from-empty --to-schema-datamodel <current schema> --script`.
Precondition: if `public."User"` exists, `onFail: MARK_RAN`. It runs on an empty
database (CI, a new laptop) and is recorded as ran without executing on
production and on existing local databases. No manual `changelog-sync`.

### 0001-auth-laura-schemas

```sql
CREATE SCHEMA auth;
CREATE SCHEMA laura;
ALTER TABLE public."User"         SET SCHEMA auth;
ALTER TABLE public."Session"      SET SCHEMA auth;
ALTER TABLE public."Account"      SET SCHEMA auth;
ALTER TABLE public."Verification" SET SCHEMA auth;
ALTER TYPE  public."Role"         SET SCHEMA auth;
ALTER TABLE public."Photo"        SET SCHEMA laura;
ALTER TABLE public."Favorite"     SET SCHEMA laura;
ALTER TABLE public."GameScore"    SET SCHEMA laura;
ALTER TABLE public."QuizQuestion" SET SCHEMA laura;
ALTER TABLE public."QuizAnswer"   SET SCHEMA laura;
ALTER TYPE  public."GameType"     SET SCHEMA laura;
```

Rollback: every statement reversed back to `public`, then `DROP SCHEMA auth;
DROP SCHEMA laura;`. `SET SCHEMA` is a catalogue rename: rows, indexes,
constraints and foreign keys move with the table.

This changeset is hand-written. `prisma migrate diff` would render the move as
drop and create, which would destroy data.

## Workflows

### Authoring a changeset (local)

1. Edit `prisma/schema/*.prisma`.
2. `pnpm db:changeset <name>`:
   - runs `liquibase update` so the local DB is at changelog head;
   - forward SQL: `prisma migrate diff --from-schema-datasource prisma/schema --to-schema-datamodel prisma/schema --script`
     (`--from-schema-datasource` limits introspection to the `schemas` list, so Liquibase's tables in `public` never appear);
   - rollback SQL: the same diff with sides swapped;
   - writes `changesets/NNNN-<name>.sql` with the `--changeset` header and each rollback statement as a `--rollback` line;
   - refuses to write an empty changeset.
3. Review and edit. Any drop, rename or type change is read by a human before it lands.
4. `pnpm db:update`.

### Local scripts

`scripts/liquibase.sh` builds the same `db-migrate` image Production uses and
runs it with the local `DATABASE_URL` (`localhost` rewritten to
`host.docker.internal`), so Local, CI and Production run identical Liquibase
bits. The image starts from `liquibase/liquibase:5.0` and adds the PostgreSQL
driver with `lpm add postgresql --global`, since 5.x ships without drivers.
`entrypoint.sh` turns `DATABASE_URL` into a JDBC URL (`jdbc-url.sh`) and passes
every other argument to `liquibase`.

| Script | Does |
|---|---|
| `db:update` | `liquibase update` |
| `db:status` | `liquibase status --verbose` |
| `db:rollback <tag>` | `liquibase rollback --tag=<tag>` |
| `db:changeset <name>` | the authoring flow above |
| `db:generate` | unchanged |

`db:push` and `db:migrate` are removed. `dev:setup` becomes docker up, generate,
`db:update`, seed.

### Rule: expand, then contract

A changeset must leave the previous app release working: add a column, backfill,
switch code, and drop the old column only in a later release. Rollback of a
destructive changeset recreates structure, not data.

## Production

### Compose services (`docker/docker-compose.prod.yml`)

1. `db-backup` (`postgres:16-alpine`): `pg_dump -Fc` of `allonfire` into volume
   `allonfire-db-backups` named with a UTC timestamp, keeps the newest 14, exits.
2. `db-migrate` (image built from `liquibase/liquibase:5.x` with `changelog/`
   copied in, root `package.json` copied as the release version source):
   `entrypoint.sh deploy` runs `liquibase update` and, only when changesets
   were pending, `liquibase tag --tag=v<release>` (`v<release>-<UTC stamp>` if
   that tag already exists). `tag` rewrites the newest changelog row, so tagging
   a deploy with nothing new would erase the previous release's tag. Release
   version comes from the root `package.json` (bumped by each `chore(release)`
   commit).
   `depends_on: db-backup: service_completed_successfully`.
3. `laura`: `depends_on: db-migrate: service_completed_successfully`. A failed
   migration means the new app container never starts.

All three join `dokploy-network`; `dokploy-postgres` is not reachable from
outside the VPS. Liquibase's `DATABASECHANGELOGLOCK` prevents two concurrent
deploys from migrating at once. Liquibase's two tables stay in `public`, which
Prisma's `schemas` list does not cover, so the drift check never sees them.

The dumps live on the same disk as the database. They serve deploy rollback, not
disaster recovery, which is out of scope here.

### One-time cutover

1. SSH to the VPS, manual `pg_dump` of `allonfire`, copied off the box.
2. Drift check: throwaway container on `dokploy-network` runs
   `prisma migrate diff --from-url <prod> --to-schema-datamodel <baseline schema> --exit-code`.
   It must report no difference; otherwise the baseline is corrected first.
3. Rehearsal: restore the dump into local Docker Postgres and run the full
   `db-backup`, `db-migrate`, `laura` chain against it.
4. Deploy. `0000` is marked ran, `0001` applied, tag written.

Known blip: the old `laura` container serves during step 4 and errors for a few
seconds after the tables move. Accepted.

### Rollback

`docker compose -f docker/docker-compose.prod.yml run --rm db-migrate rollback --tag=v0.2.0`
over SSH rolls back every changeset after that tag, newest first. Then redeploy
the matching app image. The `db-backup` dumps are the last resort when a
rollback cannot restore data.

## CI

In the `test` job, `pnpm db:push` is replaced by:

1. `liquibase update` against the job's Postgres service (Docker, same image as prod).
2. Drift check: `prisma migrate diff --from-schema-datasource prisma/schema --to-schema-datamodel prisma/schema --exit-code`.
   Editing a `.prisma` file without a changeset fails CI.

## Consumers

- Laura: `login/page.tsx`, `features/gallery/actions/gallery.ts`,
  `features/games/actions/{games,quiz,leaderboard-cache}.ts`,
  `features/upload/actions/upload.ts`, `components/user-role-provider.tsx`,
  `scripts/seed-photos.ts`, `scripts/fix-photo-dimensions.ts`: service imports
  move to `/laura` or `/auth`; type-only imports of generated types stay on the
  root.
- `packages/auth`: `guard.ts`, `actions/check-access.ts` move service imports to
  `/auth`; `server.ts` keeps `prisma` from the root.
- `apps/api`: unchanged (root `prisma`).
- Raw SQL in `photo.service.ts` and `quiz.service.ts` names tables unqualified
  (`FROM "Photo"`); after the move it must read `laura."Photo"`. Typecheck
  cannot see this, so service tests pin it.
- Better Auth's Prisma adapter addresses models by name, so the schema move is
  invisible to it.

## Docs

- Already written during grilling: `docs/adr/0007-one-postgres-schema-per-app.md`,
  `docs/adr/0008-liquibase-owns-the-changelog.md`, and the **App schema** term
  in `CONTEXT.md`.
- `docs/adr/0001-standalone-http-api.md` is left as is: moving Laura endpoints
  into the API is still a separate, later decision.
- `packages/database/README.md`: rewritten for the layout, exports, scripts,
  changeset workflow, rollback and the expand/contract rule.
- Root `CLAUDE.md`: database quick reference updated.

## Verification

- Integration test in `packages/database` against a throwaway database:
  `liquibase update` on empty, assert tables in `auth.*` and `laura.*`,
  `rollback-count --count=1`, assert tables back in `public`, `update` again. Liquibase's
  `update-testing-rollback` is the same check and may be used for it.
- CI drift check.
- `turbo typecheck` and existing app tests catch broken imports.
- The cutover rehearsal on a copy of the production dump.

## Out of scope

- Moving Better Auth or Laura endpoints into `apps/api`.
- Renaming tables to snake_case, and any Laura model redesign: models move
  unchanged, and the coming Laura redesign lands as ordinary changesets.
- Per-App roles (`Role` stays global on `User`).
- Off-box / disaster-recovery backups.
- A `shared` schema.
- Per-schema Postgres roles and grants.
