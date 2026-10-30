# Services named after their purpose

## Intent

A Docker service, its container, its volume and the hostname other services
reach it by say what the service is for, never which software runs it. The
software changes (MinIO deleted its images and we moved to a community
build); the purpose does not. After this change, swapping the software is an
`image:` line, and nothing else in the repo, the docs or a teammate's
vocabulary moves. This follows the Cloudflare DNS names already chosen
(`storage`, `workflow`).

The owner takes no step: every move, Local and Production, is done by the
change itself.

## Goals

- Every service in `docker/docker-compose.dev.yml` and
  `docker/docker-compose.prod.yml` named after its purpose, with the names below.
- Containers `allonfire-<purpose>`, volumes `<purpose>_data`.
- Every reference follows: hostnames inside compose, the pre-commit hook, CI,
  package scripts, READMEs, ADR 0006, `CLAUDE.md`.
- Local data survives: each old volume's contents end up in its new volume,
  and the old volume is removed.
- Production data survives: on the first deploy after this change, a one-shot
  service copies `allonfire-minio-data` into `allonfire-storage-data` before
  `storage` starts, only when the new volume is empty.

## Non-goals

- Redis stays `redis` (owner's call).
- Public hostnames do not change: `minio.isaiariva.com` moves with the DNS
  renames planned for the Production launch, not here.
- Dokploy's env keeps `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY`: renaming them
  would be a step in Dokploy for the owner.
- Laura's `MINIO_*` env and code stay until Laura is rebuilt.
- Images, versions and settings of each service do not change, except the one
  below.

## Anti-goals

- Any Local or Production data lost.
- A name that is still a vendor's in a place this change touches.
- A step the owner must run.

## Names

| Now | After | Container | Volume |
|---|---|---|---|
| `postgres` | `database` | `allonfire-database` | `database_data` |
| `redis` | `redis` | `allonfire-redis` | (none) |
| `minio` | `storage` | `allonfire-storage` | `storage_data` |
| `minio-init` | `storage-init` | `allonfire-storage-init` | |
| `n8n` | `workflow` | `allonfire-workflow` | `workflow_data` |
| `openobserve` | `telemetry` | `allonfire-telemetry` | `telemetry_data` |
| `umami` | `analytics` | `allonfire-analytics` | |
| `umami-user-init` | `analytics-init` | `allonfire-analytics-init` | |
| `app-db-init` | `database-init` | `allonfire-database-init` | |
| `adminer` | `database-console` | `allonfire-database-console` | |

`telemetry` and `analytics` are ADR 0006's words: OpenObserve receives the
API's traces, metrics and logs; Umami is web analytics.

Inside the Local Postgres, the `umami` and `n8n` databases become `analytics`
and `workflow` (same rule; `database-init` creates them by those names, and
the existing ones are renamed with `ALTER DATABASE ... RENAME TO`, keeping
their data).

## Production (`docker-compose.prod.yml`)

- Service `minio` becomes `storage`; `storage-setup` and `api` point at
  `http://storage:9000` and wait on `storage`.
- Traefik router and service labels `allonfire-minio` become
  `allonfire-storage`; the rule keeps `Host(\`minio.isaiariva.com\`)`.
- Volume key `storage_data`, Docker name `allonfire-storage-data`, created by
  compose (not external).
- Production has no Postgres service in this file (`db-backup` and
  `db-migrate` reach Dokploy's own Postgres through `DATABASE_URL`), so the
  `database` rename and the two database renames are Local only.
- New one-shot service `storage-move` mounts `allonfire-minio-data` (external,
  read-only) and `storage_data`. It copies everything across, preserving
  ownership and modes, then writes a marker file `.storage-moved` at the root
  of `storage_data` (MinIO ignores files outside its buckets and `.minio.sys`).
  With the marker present it does nothing. Without it, it empties
  `storage_data` first, so a copy cut short is redone whole on the next
  deploy. `storage` waits for it (`service_completed_successfully`), so
  MinIO never writes into the volume before the copy ends. (My call.)
- Dokploy deploys with `docker compose up -d --build --remove-orphans`
  (`packages/server/src/utils/builders/compose.ts`), so the old `minio`
  container, and its router for the same host, are removed on that deploy.
- `minio/minio:latest` no longer exists on Docker Hub: `storage` and
  `storage-move` use the image dev pins,
  `ghcr.io/coollabsio/minio:RELEASE.2025-10-15T17-29-55Z`.
- The old volume stays untouched: it is the rollback (redeploy the previous
  `:prod` images and compose). Deleting it is a later, separate decision.
- Data format: the Local `minio_data` volume, written by `minio/minio:latest`,
  already opens under the pinned community build (the switch made in v0.3.0),
  so the same holds for Production's.
- Rehearsal before shipping: run `storage-move` from the prod compose against
  a copy of the Local storage volume, twice (copy, then no-op), and once after
  a copy cut short. (My call.)

## Local

- A one-time move the builder runs on this machine as part of the change (not
  a committed script: only this machine holds Local data; CI's are thrown
  away): stop the
  stack, copy each `allonfire_<old>_data` volume into `allonfire_<new>_data`,
  rename the two Postgres databases (with `analytics`, `workflow` and
  `database-console` stopped, so nothing holds a connection), start the stack with the new compose,
  check the data is there (the Admin row, the `image` bucket and its object,
  n8n's workflows, OpenObserve's streams), then remove the old volumes and any
  orphaned old containers.
- Containers of other projects (`carlo`, `ai-agent-*`) are not touched.

## Constraints

- Ports stay as they are; `@allonfire/config/local/addresses` and its guard
  test reach services by port on `localhost`, never by service name.
- `POSTGRES_*`, `MINIO_ROOT_*`, `ZO_*`, `DB_POSTGRESDB_*` keep the spelling
  their image reads.
- Never revert or reformat another session's uncommitted work in the files
  touched.

## Scope of references

Everything in the repo that names an old service, container, volume or
database (`git grep`, including `.env.example` files, package scripts, docs
and ADRs; `docs/superpowers/` history excepted). Dokploy's own settings
(env, the `admin-gate@file` middleware) name none of them and stay as they
are. (My call.)

## Left to the builder

- The copy command for the Docker volumes (a throwaway container mounting
  both).
- Wording in docs.
