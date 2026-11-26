<h1 align="center">@allonfire/database</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?style=flat&logo=prisma&logoColor=white" alt="Prisma 7" />
  <img src="https://img.shields.io/badge/Liquibase-5-2962FF?style=flat" alt="Liquibase 5" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/Zod-4-3068B7?style=flat&logo=zod&logoColor=white" alt="Zod" />
  <img src="https://img.shields.io/badge/BetterAuth-1.2-000000?style=flat" alt="BetterAuth" />
</p>

<p align="center">The apps' shared database: the Prisma client, the services and access rules on top of it, and the Liquibase changelog that builds it.</p>

---

## 🔧 Use it

Import one file at a time: there is no root entry and no barrel. `package.json` lists every path.

| I want to | Use |
|---|---|
| query the database | `prisma` from `./features/prisma/client` |
| name a Role or an App, without loading the client | `./enums` |
| check access | `./features/auth/access/access` |
| read or change Users or Images | `./features/auth/user.service`, `./features/image/image.service` |
| read or change one app's own data | `./features/apps/<app>/…` |
| sign in or point at an Image in a test | `FIXTURE` from `./features/seed/fixtures/fixtures` |

```ts
import { canEnterApp } from "@allonfire/database/features/auth/access/access";

export const memberOf = (app: App, reads: AdminReads = REAL_READS): CanManage =>
  freshly(reads, (user) => canEnterApp(user, app));
```

## 🧬 Change the schema

Docker must be running: Liquibase runs only there.

1. Edit `prisma/schema/`.
2. `pnpm db:changeset <kebab-name>` updates the Local database, then drafts a changeset with its rollback.
3. Read the draft. A move or a rename often comes out as drop and create.
4. `pnpm db:update`, then `pnpm db:drift` must say `No difference detected.`

## 🗂️ Where things are

```
packages/database/
  prisma/schema/      the models; one file per app under apps/
  changelog/          Liquibase changesets, one SQL file each
  liquibase/          the db-migrate image: backup, deploy, rollback
  scripts/            drafts changesets, runs the image locally
  src/
    environment/      the variables it reads
    features/
      prisma/         the Prisma client
      auth/           User services; access/ holds the access rules
      image/          the shared Images
      service/        mail Services and their providers
      apps/           one folder per app, for its own data
      seed/           the real Admin; fixtures/ for tests
      test-database/  a throwaway database per test run
```

## ⚠️ Watch out

| Trap | Do this |
|---|---|
| Liquibase checksums applied changesets | never edit one that reached a shared database; add a new one |
| The previous release must keep working | add and backfill first; drop in a later release |
| `prisma db push` and `prisma migrate` skip the changelog | never use them |
| Tables live in named schemas | name it in raw SQL: `image."Image"` |
| The Local database has no Fixtures | the seed writes only the real Admin |
| Changelog edits leave old image tags | `docker rmi $(docker images -q allonfire-db-migrate)` |

## 🧪 Commands

Copy `.env.example` to `.env` first. From the root:

| Command | Does |
|---|---|
| `pnpm db:generate` | regenerate the Prisma client |
| `pnpm db:status` | list pending changesets |
| `pnpm db:rollback --tag=<tag>` | roll back everything after a tag |
| `pnpm db:seed` | create the real Admin (`DATABASE_SEED_ADMIN_*`) |
| `pnpm --filter @allonfire/database dev` | Prisma Studio on port 5565 (`pnpm dev` starts it too) |
| `pnpm --filter @allonfire/database test` | tests; run `pnpm docker:up` first for integration |

## 🚢 Production

Each deploy runs, in order:

```
db-backup (backup) --> db-migrate (deploy) --> storage-setup --> api --> back-office, laura
```

A failed migration leaves the old apps serving. `deploy` tags the release `v<root version>` if it applied something.

From the Dokploy compose directory on the VPS, start each command with `docker compose -f docker/docker-compose.prod.yml run --rm db-migrate`:

| To | End it with |
|---|---|
| undo back to a release, then redeploy the matching app image | `rollback --tag=v<version>` |
| undo the last N changesets | `rollback-count --count=<N>` |
| clear the lock a killed run left (deploys fail after 5 minutes) | `release-locks` |

A rollback restores structure, not data. As a last resort, restore a dump:

```bash
pg_restore --clean --if-exists --no-owner -d <url> /backups/allonfire-<stamp>.dump
```

The newest 14 dumps share the database's disk, so they are no disaster recovery.

## 📚 More

- Guides: [database](../../docs/guides/database.md), [testing](../../docs/guides/testing.md), [deployment](../../docs/guides/deployment.md), [VPS backups](../../docs/guides/vps-backups.md)
- ADRs: [one schema per App](../../docs/adr/0007-one-postgres-schema-per-app.md), [Liquibase](../../docs/adr/0008-liquibase-owns-the-changelog.md), [Profiles](../../docs/adr/0034-an-apps-data-about-a-user-lives-in-its-profile.md)
