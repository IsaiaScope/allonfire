# Liquibase owns schema changes; Prisma only drafts them

Schema changes reached Production through `prisma db push`: no history, no
rollback, and a model moved between schemas would have been dropped and
recreated. Liquibase now owns every change as a formatted-SQL changeset with its
own `--rollback` lines, and `liquibase rollback --tag=<release>` walks back any
number of releases. Prisma stays the source of truth for models:
`prisma migrate diff` generates the forward and rollback SQL that a changeset
starts from, and a CI drift check fails when a `.prisma` file changes without a
changeset.

## Considered Options

- **Prisma Migrate**: one tool and no Java, but no rollback command; multi-version
  rollback would be a script we maintain.
- **node-pg-migrate**: Liquibase-style `down N` on Node, but Postgres-only and
  every change written twice, once as a migration and once in `schema.prisma`.
- **Liquibase**: built-in tags and rollback, and a tool worth learning. Chosen,
  with Prisma drafting the SQL so nothing is written twice.

## Consequences

- Liquibase 5.x is under the Functional Source License: free for any use except
  a competing product, and each release becomes Apache 2.0 after two years.
  Pin 4.x if that ever matters.
- It needs a JVM, so it runs only in Docker: the `db-migrate` image, run by
  `packages/database/scripts/liquibase.sh` in Local and CI, and as a one-shot
  `db-migrate` service in Production, after a `db-backup` dump and before the
  Apps start.
- Rollback restores structure, not data. Changesets follow expand, then
  contract, and the per-deploy dumps are the last resort.
