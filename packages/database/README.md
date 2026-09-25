<h1 align="center">@allonfire/database</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat&logo=prisma&logoColor=white" alt="Prisma 6" />
  <img src="https://img.shields.io/badge/Liquibase-5-2962FF?style=flat" alt="Liquibase 5" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/Zod-4-3068B7?style=flat&logo=zod&logoColor=white" alt="Zod" />
  <img src="https://img.shields.io/badge/BetterAuth-1.2-000000?style=flat" alt="BetterAuth" />
</p>

<p align="center">Shared database layer for the AllOnFire monorepo: one Prisma client over the App schemas, typed services per App, and the Liquibase changelog that builds the database.</p>

---

## App Schemas

Every App keeps its tables in its own Postgres schema of the `allonfire`
database ([ADR 0007](../../docs/adr/0007-one-postgres-schema-per-app.md)).

| Schema | Owner | Holds |
|---|---|---|
| `auth` | the user base every App shares (Better Auth) | `User`, `Session`, `Account`, `Verification`, enums `Role`, `AllowedApp` |
| `laura` | Laura | `Photo`, `Favorite`, `GameScore`, `QuizQuestion`, `QuizAnswer`, enum `GameType` |
| `public` | Liquibase | `databasechangelog`, `databasechangeloglock` only |

Foreign keys cross schemas (`laura."Photo"."uploadedBy"` references
`auth."User"."id"`), so one Prisma client spans them all. Prisma requires
back-relations, which is why `User` in `auth.prisma` lists Laura's models.

## Exports

| Import | Content |
|---|---|
| `@allonfire/database` | `prisma`, `PrismaClient`, generated types (`Role`, `GameType`, models) |
| `@allonfire/database/features/auth/user.service` | `getUserById`, `getUsers`, `deleteUser`, `checkUserAppAccess`, `updateUserAllowedApps` |
| `@allonfire/database/features/laura/photo.service` | `getPhotosPaginated`, `createPhoto`, `deletePhoto`, `getPhotoCount`, `getRandomPhotos`, `getAllRandomPhotos`, `getUserPhotoCount`, type `PhotoWithUser` |
| `@allonfire/database/features/laura/favorite.service` | `toggleFavorite`, `getFavoritePhotoIds`, `getFavoritesPaginated` |
| `@allonfire/database/features/laura/game-score.service` | `submitGameScore`, `getLeaderboard`, `getUserBestScore`, `getGlobalBestScore`, `getUserGameStats`, `getGameStats`, type `LeaderboardEntry` |
| `@allonfire/database/features/laura/quiz.service` | `createQuizQuestion`, `getRandomQuizQuestions`, `getQuizQuestionCount`, `getAllQuizQuestions`, `getQuizQuestionById`, `updateQuizQuestion`, `deleteQuizQuestion`, type `QuizQuestionWithAnswers` |
| `@allonfire/database/enums` | Prisma enums as runtime values (`Role`, `AllowedApp`, `GameType`) with no client attached |
| `@allonfire/database/environment/environment` | Zod-validated `DATABASE_URL` and `NODE_ENV` (`src/environment/environment.ts`) |

One subpath per service file, no barrel. Raw SQL names the schema:
`FROM laura."Photo"`, never `FROM "Photo"`.

```ts
import { getLeaderboard } from "@allonfire/database/features/laura/game-score.service";

const leaderboard = await getLeaderboard("MEMORY", 25);
```

## Changing the Schema

Liquibase owns every change; Prisma drafts the SQL
([ADR 0008](../../docs/adr/0008-liquibase-owns-the-changelog.md)).

1. Edit `prisma/schema/*.prisma`.
2. `pnpm db:changeset <kebab-name>` brings the local database to the head of
   the changelog, diffs it against the Prisma schema, and writes
   `changelog/changesets/NNNN-<name>.sql` with the forward SQL and a
   `--rollback` line per statement. It refuses when nothing changed.
3. Read it. Drops, renames and type changes are where Prisma's draft is wrong
   most often: a moved or renamed thing comes out as drop and create.
4. `pnpm db:update`, then `pnpm db:drift` must say `No difference detected.`

Rules:

- **Never edit a changeset that has reached any shared database.** Liquibase
  checksums it and refuses to run. Fix forward with a new one.
- **Expand, then contract.** A changeset must leave the previous release
  working: add, backfill, switch the code, and drop the old thing only in a
  later release. Rollback recreates structure, not data.
- Never `prisma db push` or `prisma migrate`.

CI applies the changelog to an empty database, runs the drift check, and
fails a `.prisma` edit that has no changeset.

## Scripts

| Command | Does |
|---|---|
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:update` | Apply pending changesets |
| `pnpm db:status` | List pending changesets |
| `pnpm db:rollback --tag=<tag>` | Roll back every changeset after a tag |
| `pnpm db:changeset <name>` | Draft a changeset from the Prisma schema |
| `pnpm db:drift` | Compare the database with the Prisma schema |
| `pnpm db:seed` / `db:seed-quiz` | Seed users and mock data / quiz questions (data in `src/features/seed/mock/`) |
| `pnpm --filter @allonfire/database dev` | Open Prisma Studio on :5555 (`pnpm dev` starts it too) |
| `pnpm test` | Unit tests, plus `*.integration.test.ts` against Docker and the dev Postgres (`pnpm docker:up`). Tests live in a `tests/` folder beside what they test |

Liquibase needs Java, so it only runs in Docker: every `db:*` Liquibase script
builds the same `db-migrate` image Production runs (`scripts/liquibase.sh`).

## The db-migrate Image

`liquibase/Dockerfile`, built from the repo root.

- `liquibase/liquibase:5.0.4` pinned by digest, the PostgreSQL JDBC driver
  pinned and checksum-verified, `postgresql-client-16` for backups.
  Dependabot bumps the base image.
- Runs as the unprivileged `liquibase` user; the changelog and scripts are
  root-owned and read-only to it. Compose and `scripts/liquibase.sh` add a
  read-only root filesystem, no Linux capabilities and `no-new-privileges`.
- `DATABASE_URL` is split by `liquibase/database-url.sh`: the password
  reaches Liquibase as `LIQUIBASE_COMMAND_PASSWORD` (masked in its output) and
  pg_dump as `PGPASSWORD`, never inside a URL or on a command line.
- Liquibase runs strict (`LIQUIBASE_STRICT=true`), with duplicate changelog
  files as errors and a 5-minute lock wait. Sessions set `lock_timeout=10s`, so
  a schema change waiting behind the App fails the deploy instead of stalling
  the App.

| Command | Does |
|---|---|
| `backup` | `pg_dump -Fc` into `/backups`, verified with `pg_restore --list` before it counts; keeps the newest `BACKUP_KEEP` (14) |
| `deploy` | `update` (which validates the changelog first), then tags the release (`v<root package.json version>`) only if something was applied |
| anything else | passed to `liquibase` (`status --verbose` by default) |

## Production

Each deploy of the compose stack runs, in order:

```
db-backup (backup) --> db-migrate (deploy) --> laura
```

Each step starts only when the one before it exited 0, so a failed migration
leaves the old App serving. Dumps live in the `allonfire-db-backups` volume on
the same disk as the database: they serve rollback, not disaster recovery.

Roll back from the Dokploy compose directory on the VPS, then redeploy the
matching App image:

```bash
docker compose -f docker/docker-compose.prod.yml run --rm db-migrate rollback --tag=v0.2.0
```

The schema move itself (`0001-auth-laura-schemas`) has no tag before it on
Production: the baseline is recorded and 0001 applied in the same deploy, and
that deploy's tag lands on 0001. Undo it by count instead:

```bash
docker compose -f docker/docker-compose.prod.yml run --rm db-migrate rollback-count --count=1
```

A run killed mid-deploy can leave the changelog lock held; the next deploy
waits 5 minutes and fails. Clear it with
`docker compose -f docker/docker-compose.prod.yml run --rm db-migrate release-locks`.

Last resort, when a rollback cannot bring data back: restore a dump.

```bash
pg_restore --clean --if-exists --no-owner -d <url> /backups/allonfire-<stamp>.dump
```

## Directory Structure

```
packages/database/
  prisma/schema/
    schema.prisma           generator + datasource (schemas = auth, laura)
    auth.prisma             auth schema
    laura.prisma            laura schema
  changelog/
    db.changelog-master.yaml  root changelog, never edited
    changesets/             one formatted-SQL changeset per file, in order
  liquibase/
    Dockerfile              the db-migrate image
    entrypoint.sh           backup | deploy | any Liquibase command
    database-url.sh         DATABASE_URL -> JDBC URL, libpq URL, user, password
    tests/                  URL split, changelog up/down/deploy, backup;
                            throwaway-db.ts (scratch databases)
  scripts/
    liquibase.sh            build and run the image locally
    changeset.ts            pnpm db:changeset
    changeset-file.ts       changeset naming and formatting
    tests/
  src/
    index.ts                prisma + generated types (the root export)
    environment/            environment.ts (package), seed-environment.ts
                            (seed scripts), tests/
    features/
      prisma/               client.ts (Prisma singleton)
      auth/                 auth services
      laura/                Laura services, tests/ (raw SQL against the DB)
      seed/                 seed.ts, seed-quiz.ts, seed-user.ts, tests/
        mock/               users.json, quiz-questions.ts
```

## Dependencies

| Package | Purpose |
|---|---|
| `@prisma/client` / `prisma` | Generated client; `prisma migrate diff` drafts changesets |
| `@t3-oss/env-core` | Type-safe environment validation |
| `better-auth` | Password hashing in the seed script |
| `zod` | Runtime schema validation |
