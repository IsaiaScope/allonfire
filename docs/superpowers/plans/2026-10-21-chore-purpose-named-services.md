# Services Named After Their Purpose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Docker service, container, volume, hostname and Postgres database in the Local and Production compose files is named after its purpose (`database`, `storage`, `workflow`, `telemetry`, `analytics`), with Local and Production data moved into the new volumes and no step left for the owner.

**Status:** implemented (uncommitted) @ 2026-10-21T08:32:51Z

**Architecture:** A unit guard test in `@allonfire/config` reads both compose files and every caller as text and fails on any old name. Production gets a one-shot `storage-move` service that copies the old external volume into the new one, once, before `storage` starts. The Local data is moved once on this machine by the builder.

**Tech Stack:** Docker Compose, Vitest (globals), Postgres 16, the pinned community MinIO build.

**Spec:** `docs/superpowers/specs/2026-10-21-purpose-named-services-design.md`

## Global Constraints

- Names: `postgres`→`database`, `redis` unchanged, `minio`→`storage`, `minio-init`→`storage-init`, `n8n`→`workflow`, `openobserve`→`telemetry`, `umami`→`analytics`, `umami-user-init`→`analytics-init`, `app-db-init`→`database-init`, `adminer`→`database-console`.
- Containers `allonfire-<purpose>`; volumes `database_data`, `storage_data`, `workflow_data`, `telemetry_data`; Local Postgres databases `umami`→`analytics`, `n8n`→`workflow`.
- Production: service `storage`, router/service labels `allonfire-storage`, rule still `Host(\`minio.isaiariva.com\`)`, volume `allonfire-storage-data`, image `ghcr.io/coollabsio/minio:RELEASE.2025-10-15T17-29-55Z`, Dokploy env still `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`.
- Ports unchanged. Env vars an image reads keep their spelling (`POSTGRES_*`, `MINIO_ROOT_*`, `ZO_*`, `DB_POSTGRESDB_*`). Laura's `MINIO_*` untouched. Vendor badges in READMEs stay (they name the software).
- `docs/superpowers/` history is not rewritten.
- No owner step. No commit (iso-write). Other sessions' uncommitted changes in these files are kept as they are.

## Review Focus

- A `storage-move` cut short (killed mid-copy) leaves a half-filled volume: the next deploy must redo the copy whole, not start MinIO on it. Pinned in Task 2, Step 4.
- The `.storage-moved` marker at the volume root must not show up as a bucket or break MinIO's start. Pinned in Task 2, Step 4.
- Local: `database-init` creating an empty `analytics` before `umami` is renamed would make the rename fail and drop Umami's data from view. Pinned by the order in Task 4, Step 3.
- Old containers (`allonfire-postgres`, `allonfire-minio`, …) still running after the switch would hold ports 5432/9000 and serve stale data. Pinned in Task 4, Step 4.
- The owner's running `pnpm dev` API loses Postgres and MinIO for the length of the move; it must answer `/ready` 200 afterwards without a restart. Pinned in Task 4, Step 5.

---

### Task 1: Local compose and its callers use the purpose names

**Files:**
- Create: `packages/config/local/tests/service-names.test.ts`
- Modify: `docker/docker-compose.dev.yml` (every service, `container_name`, `depends_on`, hostnames `postgres`→`database` in `PGHOST`, `DATABASE_URL`, `DB_POSTGRESDB_HOST`, `http://minio:9000`→`http://storage:9000`, `database-init`'s loop `for db in analytics workflow`, Umami's URL `/analytics`, n8n's `DB_POSTGRESDB_DATABASE: workflow`, the `volumes:` block and comments)
- Modify: `.husky/pre-commit:13`, `.github/workflows/ci.yml` (`up -d --wait database redis storage`, `--wait storage`, step names, GitHub service key `postgres:`→`database:`), `apps/api/package.json` (`predev`: `up -d redis telemetry storage storage-init`), `apps/api/.env.example:56` comment, `apps/api/src/features/rate-limit/tests/rate-limiter.integration.test.ts:16` unchanged (`redis` stays)

**Interfaces:**
- Produces: the guard test file; Task 2 adds the prod file to it.

- [x] **Step 1: Write the failing guard test**

`// @module-tag unit`, same exact-text style as `local-files.test.ts` (read files from `REPO`, no YAML parser). Two tests:

```ts
const OLD = ["postgres", "minio", "minio-init", "n8n", "openobserve", "umami", "umami-user-init", "app-db-init", "adminer"] as const;
const FILES = ["docker/docker-compose.dev.yml", ".husky/pre-commit", ".github/workflows/ci.yml", "apps/api/package.json"] as const;

it.each(FILES)("names no service in %s after its software", (file) => {
  const text = read(file);
  for (const name of OLD) {
    expect(text).not.toMatch(new RegExp(`^  ${name}:$`, "m"));          // service key
    expect(text).not.toMatch(new RegExp(`allonfire-${name}\\b`));       // container
    expect(text).not.toMatch(new RegExp(`\\b${name}:\\d{4}\\b`));       // hostname:port
    expect(text).not.toMatch(new RegExp(`\\b${name}_data\\b`));         // volume
    expect(text).not.toMatch(new RegExp(`--wait[^\\n]*\\b${name}\\b`)); // compose up callers
  }
});

it("names every Local service after its purpose", () => {
  const text = read("docker/docker-compose.dev.yml");
  for (const name of ["database", "redis", "storage", "storage-init", "workflow", "telemetry", "analytics", "analytics-init", "database-init", "database-console"]) {
    expect(text).toMatch(new RegExp(`^  ${name}:\\n    container_name: allonfire-${name}$`, "m"));
  }
});
```

`postgres:16-alpine` and `minio` inside image names must not trip the first test: the patterns above anchor on `^  name:$`, `allonfire-`, `:<4 digits>`, `_data` and `--wait`, none of which an image reference matches. Adjust a pattern only if the run shows a false hit, never by listing an exception.

- [x] **Step 2: Run it, expect FAIL**

Run: `cd packages/config && npx vitest run local/tests/service-names.test.ts`
Expected: FAIL on `postgres`, `minio`, … in every file.

- [x] **Step 3: Rename in `docker-compose.dev.yml` and the three callers per Files above**

Keep every image, port, env value and healthcheck. Update comments that name a service by its software name (`postgres_data already exists…` → `database_data`).

- [x] **Step 4: Run it, expect PASS; validate the compose file**

Run: `cd packages/config && npx vitest run local/tests/` → all pass (the existing `local-files.test.ts` too).
Run: `docker compose -f docker/docker-compose.dev.yml config --quiet` → exit 0.
Do **not** `up` yet: Task 4 moves the data first.

---

### Task 2: Production storage is `storage`, and its data moves itself

**Files:**
- Modify: `docker/docker-compose.prod.yml`
- Modify: `packages/config/local/tests/service-names.test.ts`

**Interfaces:**
- Consumes: Task 1's `OLD`, `read`, guard pattern.

- [x] **Step 1: Add the failing prod test**

Add `"docker/docker-compose.prod.yml"` to `FILES`, and:

```ts
it("moves Production's storage data before storage starts", () => {
  const text = read("docker/docker-compose.prod.yml");
  expect(text).toMatch(/^  storage-move:$/m);
  expect(text).toMatch(/^  storage:$/m);
  expect(text).toContain("name: allonfire-storage-data");
  expect(text).toContain("name: allonfire-minio-data");
  expect(text).toContain("traefik.http.routers.allonfire-storage.rule=Host(`minio.isaiariva.com`)");
  expect(text).not.toContain("minio/minio:latest");
  expect(text).toContain("STORAGE_ENDPOINT=http://storage:9000");
});
```

Run: `cd packages/config && npx vitest run local/tests/service-names.test.ts` → FAIL.

- [x] **Step 2: Edit `docker-compose.prod.yml`**

- `minio` → `storage`, image `ghcr.io/coollabsio/minio:RELEASE.2025-10-15T17-29-55Z`, `volumes: - storage_data:/data`, labels `allonfire-minio` → `allonfire-storage` (rule host unchanged), `depends_on: storage-move: condition: service_completed_successfully`.
- `storage-setup` and `api`: `STORAGE_ENDPOINT=http://storage:9000`, `depends_on: storage` (healthy).
- New `storage-move`, same image, `restart: "no"`, volumes `old_storage_data:/from:ro` and `storage_data:/to`, one `sh -c` doing, in order: exit 0 when `/to/.storage-moved` exists; empty `/to` (dotfiles included); `cp -a /from/. /to/`; `touch /to/.storage-moved`. `set -e`, so a failed copy exits non-zero and `storage` never starts.
- `volumes:` → `old_storage_data: { external: true, name: allonfire-minio-data }`, `storage_data: { name: allonfire-storage-data }`; drop `minio_data`.
- A comment above `storage-move` saying why it exists, that it is a no-op once the marker is there, and that the old volume is the rollback.

- [x] **Step 3: Run the guard test, expect PASS; validate**

Run: `cd packages/config && npx vitest run local/tests/service-names.test.ts` → PASS.
Run: `DATABASE_URL=x API_REDIS_URL=x AUTH_SECRET=x AUTH_COOKIE_DOMAIN=x API_HOST=x BACK_OFFICE_HOST=x BACK_OFFICE_URL=x MINIO_ACCESS_KEY=x MINIO_SECRET_KEY=x docker compose -f docker/docker-compose.prod.yml config --quiet` → exit 0 (add any other required var the error names).

- [x] **Step 4: Rehearse `storage-move` against a copy of Local storage**

On this machine, with a throwaway project name so nothing Local is touched:
1. Create `allonfire-minio-data` as a copy of `allonfire_minio_data` (Local, before Task 4 moves it): `docker volume create allonfire-minio-data`, then `docker run --rm -v allonfire_minio_data:/from:ro -v allonfire-minio-data:/to postgres:16-alpine sh -c 'cp -a /from/. /to/'`.
2. `docker compose -p rehearsal -f docker/docker-compose.prod.yml run --rm storage-move` (env as in Step 3) → exit 0; `allonfire-storage-data` holds `image/` and `.storage-moved`.
3. Run it again → exit 0, nothing copied (marker short-circuit; check with a file timestamp).
4. Cut-short case: delete `.storage-moved` from `allonfire-storage-data` and add a stray file; run again → the stray file is gone, `image/` is back, marker present.
5. Start MinIO on the result (`docker run --rm -d --name rehearsal-storage -v allonfire-storage-data:/data -p 19000:9000 <image> server /data`), `mc ls` through it → lists `image` (and `laura` if present), no bucket named `.storage-moved`; `mc ls .../image/` lists the sign-in object.
6. Remove `rehearsal-storage`, `allonfire-minio-data`, `allonfire-storage-data`.

If the image lacks a tool the command uses, switch `storage-move` to `postgres:16-alpine`-style busybox commands that it has, and rerun 2-5.

---

### Task 3: Docs say the purpose names

**Files:**
- Modify: `apps/api/README.md:85`, `apps/api/.env.example:56` (if Task 1 left it), `packages/storage/README.md` (`minio-init` → `storage-init`), `docs/adr/0006-self-hosted-observability.md` (`http://minio:9000` → `http://storage:9000`; the Production `umami` database → `analytics`; `umami-user-init` → `analytics-init`), `CLAUDE.md` (any service name; add one line under Deployment: services, containers and volumes are named after their purpose, never their software)
- Modify (outside the repo, the builder's own memory): `~/.claude/projects/-Volumes-Crucial-4T-repo-allonfire/memory/feedback_dev_db_access.md` (`allonfire-postgres` → `allonfire-database`)

- [x] **Step 1: Sweep**

Run: `git grep -nE '\b(minio-init|app-db-init|umami-user-init|openobserve_data|n8n_data|postgres_data|minio_data)\b|allonfire-(postgres|minio|n8n|openobserve|umami|adminer)\b|\b(postgres|minio|n8n|openobserve|umami):[0-9]{4}' -- . ':!docs/superpowers' ':!apps/laura'`
Expected after the edits: only `docker/docker-compose.prod.yml`'s `name: allonfire-minio-data` (the old volume `storage-move` reads) and its comment.

- [x] **Step 2: Check**

Run: `pnpm --filter @allonfire/config test` → PASS.

---

### Task 4: Move the Local data (this machine, once)

No file changes. Redis is not touched.

- [x] **Step 1: Stop the old services and create the new ones**

`docker stop allonfire-postgres allonfire-minio allonfire-n8n allonfire-openobserve allonfire-umami allonfire-adminer` (only these; never `carlo`, `ai-agent-*` or anything else). Then `docker compose -f docker/docker-compose.dev.yml create`: the new volumes and containers exist, nothing starts.

- [x] **Step 2: Copy each volume**

For each pair (`postgres_data`→`database_data`, `minio_data`→`storage_data`, `n8n_data`→`workflow_data`, `openobserve_data`→`telemetry_data`, all prefixed `allonfire_`):
`docker run --rm -v allonfire_<old>:/from:ro -v allonfire_<new>:/to postgres:16-alpine sh -c 'cp -a /from/. /to/'`.
Check: `du -s` of each pair matches.

- [x] **Step 3: Rename the two databases before `database-init` runs**

`docker compose -f docker/docker-compose.dev.yml up -d --wait database`, then `ALTER DATABASE umami RENAME TO analytics; ALTER DATABASE n8n RENAME TO workflow;` through `docker exec allonfire-database psql -U allonfire -d postgres`. Then `docker compose -f docker/docker-compose.dev.yml up -d --remove-orphans`.

- [x] **Step 4: Verify**

- `docker ps --format '{{.Names}}' | grep allonfire` lists only the new names plus `allonfire-redis` (one-shots exited 0: `docker ps -a`).
- `psql -c 'select email from auth."User"'` in `allonfire` → the Admin.
- `mc ls` through `allonfire-storage` → `image` holds the sign-in object.
- `psql -d workflow -c 'select count(*) from workflow_entity'` matches the count read from `n8n` before Step 1 (read it first).
- `curl -s -o /dev/null -w '%{http_code}' localhost:<telemetry port>/healthz` → 200; Umami's login page answers 200.

- [x] **Step 5: The running dev stack recovers**

`curl -s localhost:3300/ready` → 200 and `localhost:3400/storage/images/<sign-in key>` → 200, without restarting `pnpm dev`. If the API answers 503, report it; do not kill the owner's dev server.

- [x] **Step 6: Remove the old volumes**

`docker volume rm allonfire_postgres_data allonfire_minio_data allonfire_n8n_data allonfire_openobserve_data`, plus the old-format test leftover `allonfire-test-backup-1791975236-md32u5`.

- [x] **Step 7: Repo-wide checks**

`pnpm lint`, `pnpm turbo run check-types test` (the pre-commit's `--wait database redis storage` path) → pass, failures only where they were before this change.

## Implementation Log
- Implemented: 2026-10-21T08:32:51Z
- Workspace: no-branch — dev (beside another session's uncommitted work, by the owner's choice)
- Committed: no — awaiting user review
- Rehearsal: `storage-move` copied a Local storage copy, did nothing on a second run, redid a cut-short copy whole; MinIO started on the result and listed the same buckets, none named `.storage-moved`.
- Local move: four volumes copied (telemetry grew from 82 MB to 607 MB on disk only: same 1116 files and bytes, sparse files written out), `umami`/`n8n` renamed to `analytics`/`workflow`, old containers and volumes removed; Admin, n8n's user and Umami's user present; `/ready` 200 without restarting `pnpm dev`.
- Slip, repaired: the running `vitest --ui` test bucket (pid 39702) was removed by mistake; recreated with its policy and the 5 Image Fixtures.
- Checks: `pnpm lint` clean; config 83, storage 168, api 189 pass. `@allonfire/core` check-types and test fail on another session's Tailwind work (`@tailwindcss/oxide`, `@tailwindcss/node` not installed), not on this change.

