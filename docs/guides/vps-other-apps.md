# VPS other apps

Every app on the VPS that is neither AllOnFire, the Workflow service nor the agent: what it is, where it runs, its data, its past. Overview: `vps.md`. Backups: `vps-backups.md`.

## MonorepoOnFire (portfolio)

- What: the owner's portfolio; Hono server that also serves the Vite-built portfolio. Repo `monorepoonfire` (separate), branch `production`.
- Runs: Dokploy application `monorepoonfire-…` (Swarm service), image built by Dokploy on the server from the repo's `Dockerfile`, port 3075; Dokploy's GitHub webhook deploys a push to `production`.
- Hosts: `www.isaiariva.com` (Traefik file `monorepoonfire-….yml`); bare `isaiariva.com` 301 to `www.` (`bare-domain-redirect.yml`, a `redirectRegex` on a dummy service).
- Data: database `monorepoonfire` with its own user in the shared `dokploy-postgres`, reached as `dokploy-postgres:5432` on `dokploy-network`; backed up by `postgres-all`. Env (`DATABASE_URL`, `PORT`, …) in Dokploy.

## Multica (agent work board)

- What: Multica, the board for issues, agents, skills and workspaces.
- Runs: compose `applications-multica`: `multica-backend`, `multica-frontend` (v0.5.2), `multica-postgres` (pgvector, Postgres 17).
- Host: `board.isaiariva.com`, routed by the Traefik file `board-routes.yml` (not a Dokploy domain) plus its env `MULTICA_PUBLIC_URL`, `FRONTEND_ORIGIN`, `CORS_ALLOWED_ORIGINS`.
- Data: volumes `multica_pgdata` and `multica_backend_uploads`; backed up as `multica-postgres` (custom-format dump) and `multica-uploads`.
- Upgrade: the `/hetzner-update` skill (its `verify_cmd` in `~/.config/hetzner/hetzner.json`, `software.multica`); it backs the database up first.

## Adminer (database console)

- What: Adminer 4.8.1, a web UI for the shared Postgres.
- Runs: compose `infrastructure-adminer` (Dokploy's Infrastructure project), on `dokploy-network`, `ADMINER_DEFAULT_SERVER=dokploy-postgres`.
- Host: `database-console.isaiariva.com` (Traefik file `adminer-routes.yml`) behind `admin-gate@file`, then Adminer's own login: System PostgreSQL, server `dokploy-postgres`, a database user and its password.
- Data: none of its own.

## Beszel (monitoring)

- What: Beszel hub (web UI, PocketBase) plus agent; host and container metrics and their history.
- Runs: compose `infrastructure-beszel`; the agent runs with `network_mode: host` and talks to the hub over a unix socket (`/beszel_socket/beszel.sock`), no agent port.
- Host: `monitor.isaiariva.com` (Traefik file `beszel-routes.yml` to the hub's published port), Beszel's own login only.
- Data: the hub's `/beszel_data` (PocketBase: history, users, settings); backed up as `beszel-data` via `docker cp`.

## Utility apps

- What was planned (2026-02-27): a separate `utility-apps` Turborepo of Next.js standalone apps, one multi-stage `Dockerfile` with `--build-arg APP_NAME`, a shared Drizzle database package, a database per app in the shared Postgres, one Dokploy service and `<app>.isaiariva.com` per app.

## History and gotchas

- 2026-02-27: MonorepoOnFire: Railway build ran `drizzle-kit push` against the live DB; a Docker build must not reach a database; `build:docker` scripts (hono `tsc` + `tsc-alias`, portfolio Vite) skip drizzle-kit.
- 2026-02-27: MonorepoOnFire: `Dockerfile` in three stages: `deps` (pnpm via corepack, `--frozen-lockfile`, package.json files first for caching), `builder` (portfolio first, it outputs into `app/hono/portfolio/`, then hono, then `pnpm deploy --prod` for a flat `node_modules`), `runner` (non-root, only `dist/`, `portfolio/`, `node_modules/`, `package.json`).
- 2026-02-27: MonorepoOnFire: schema changes no longer run at build time (the "migration gap"); the plan was `drizzle-kit push` by hand against the VPS database.
- 2026-02-27: MonorepoOnFire: `ci-production.yaml` stopped writing `.env.production` and printing it to the CI log; current actions, Node 22, pnpm action, tests.
- 2026-03: MonorepoOnFire: data moved from Turso (libSQL) to Postgres: Drizzle driver `libsql` to `pg`, schema by `drizzle-kit push`, rows as SQLite `INSERT`s into `psql`.
- 2026-10: Multica: host renamed `multica.` to `board.`; routes and the three env values changed together.
- 2026-03: Adminer: compose recreated after joining `dokploy-network`; it had to run under its Dokploy project name: `docker compose -p infrastructure-adminer-… up -d` from `/etc/dokploy/compose/infrastructure-adminer-…/code`.
- 2026-03: Adminer: at `db.` behind its own basic auth (`adminer-access.yml`); 2026-10 moved to `database-console.` behind the shared `admin-gate`.
- 2026-03-04: Beszel: deployed, about 30 MB for hub and agent; basic auth in front looped with PocketBase's login and was removed (`vps-security.md`).
- 2026-02-27: Utility apps: never built: the `utility-apps` repo, its Dokploy project, CI workflow and databases; nothing runs on the VPS.
