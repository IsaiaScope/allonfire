# Production launch: the new stack goes live on the VPS

## Intent

`TODO.md`'s "Production launch" items, plus the production infrastructure
pieces that were in Quality Fixes A, become one plan. It runs **before** A
and B. When it ends:

- AllOnFire's new stack runs in production under purpose-named hostnames,
  with telemetry live, behind Cloudflare's proxy;
- Laura and every leftover the owner ticks are gone from the VPS.

## Order (each step needs the one before it)

0. **The local production env files** (owner's request).
   - A git-ignored `.env.production` sits beside every existing `.env`: the
     root, `apps/api`, `packages/database` and `packages/storage`. The Back
     Office's sits one folder down, at `apps/back-office/env/.env.production`,
     because Next auto-loads a `.env.production` in the App's root on every
     `next build`.
   - Each file has a committed `.env.production.example` with the keys and
     empty values, grouped by where each value goes (`# GitHub prod`,
     `# Dokploy AllOnFire`, `# Dokploy Multica`, …).
   - The owner fills in the values. Every later step reads them only through
     one script, `scripts/env-production.sh`:
     - `keys <file>` prints the key names;
     - `gh-secret <file> <key> <env>` pipes a value into `gh secret set`;
     - `copy <file> <key>` puts a value on the clipboard for a Dokploy paste;
     - `check <file>` names every empty key.

     No command ever prints a value.
   - `.gitignore` gains `.env.production` and `env/.env.production`. The
     commit credential guard and a repo test both refuse a tracked
     `.env.production`.
   - The `POSTGRES_*` block in the root `.env.example` belongs to the
     `database` service. Its names are the ones the Postgres image reads, the
     same exception as `OTEL_*`. The plan checks whether Compose actually
     reads that root file when run with `-f docker/...`, since Compose looks
     for `.env` in the compose file's directory. If it doesn't, the block
     moves to where Compose reads it, and the docs say so.

1. **The Back Office build stops reading storage.** This was Plan A Task 12,
   now moved here.
   - `STORAGE_ENDPOINT` and `STORAGE_BUCKET` leave the Dockerfile, the
     `deploy.yml` build-arg, the `ci.yml` build env, turbo's `build.env`
     (`globalPassThroughEnv` stays), the Playwright build step, the prod
     compose comment, and the Back Office's `.env.example` and scripts, along
     with their false comments.
   - This comes first so the `prod` environment never gets a secret nobody
     reads. Once no workflow references `secrets.STORAGE_ENDPOINT`, it is
     deleted with `gh` from the repo and from the `dev` environment.
2. **Inventory the VPS**, read-only:
   - over SSH (`/hetzner-ssh`): every Dokploy app and compose, every
     container, volume, bucket and Postgres database or schema;
   - Cloudflare: every DNS record on `isaiariva.com`, read through
     `/iso-browser` or by the owner.

   Each item is marked `AllOnFire needs it`, `renamed`, `Laura` or
   `not referenced`. The owner ticks what goes (`AskUserQuestion`). Nothing
   is removed in this step.
3. **The GitHub `prod` environment**, created with `gh`.
   - Its secrets have the same names as `dev`: `NEXT_PUBLIC_API_URL`
     (`https://api.isaiariva.com`), `BACK_OFFICE_URL` and `DOKPLOY_API_KEY`.
     **No `STORAGE_ENDPOINT`.**
   - Dokploy's production env gets
     `BACK_OFFICE_URL=https://back-office.isaiariva.com`.
   - Every value comes from the `.env.production` files, through the
     script. The plan never invents one.
   - Dokploy also gets every other variable the prod compose requires:
     - `DATABASE_URL`, `API_REDIS_URL`, `AUTH_SECRET`;
     - `API_HOST=api.isaiariva.com`, `BACK_OFFICE_HOST`,
       `IMAGE_SERVER_HOST=cdn.isaiariva.com`;
     - `STORAGE_IMAGE_SERVER_KEY` and `STORAGE_IMAGE_SERVER_SALT`;
     - the storage login;
     - `DOKPLOY_URL` and `DOKPLOY_COMPOSE_ID`, as GitHub vars.

     The inventory says which already exist.
   - The new public hosts `api.` and `cdn.` get their A records here, DNS
     only.
4. **The production telemetry service.** This was Plan A Task 3a, now moved
   here.
   - ADR 0006's OpenObserve `telemetry` service goes into
     `docker-compose.prod.yml`: S3 bucket `telemetry`, 14-day retention,
     768 MB cap, memory settings, no published port, and
     `observe.isaiariva.com` behind `admin-gate@file`.
   - The `telemetry` bucket is added to the storage init.
   - It gets an `observe` A record (DNS only for now), and Dokploy gets its
     values:
     - `OO_S3_ACCESS_KEY` and `OO_S3_SECRET_KEY`;
     - the root user, read on first start only;
     - the ingest service account, whose base64 basic auth becomes
       `OTEL_EXPORTER_OTLP_HEADERS` for the API and the Back Office;
     - the endpoint `http://telemetry:5080/api/default`.
5. **The new hostnames**, each added before the old one goes: `storage.`
   (was `minio.`), `board.` (was `multica.`) and `workflow.` (was `n8n.`).
   - Each is an A record on `188.245.174.30`, DNS only for now, with the
     same comment as the old one.
   - Every config points at the new name:
     - the `allonfire-storage` Traefik rule;
     - every `STORAGE_*` public endpoint value in Dokploy;
     - Multica's and n8n's Dokploy domains;
     - `~/.config/hetzner/software.json`'s Multica `verify_cmd`;
     - any doc or test naming the old host.
6. **The first real deploy.** The cascade dev, then test, then prod runs
   through `/iso-push --cascade`. `deploy.yml` builds, and Dokploy runs the
   prod compose.
   - **Before the deploy, with the owner's yes**, the plan drops the
     `allonfire` database's schemas. `db-migrate` then builds them fresh.
     The owner chose this: "drop and start empty".
   - A one-shot seed creates the owner's Back Office Admin from
     `DATABASE_SEED_ADMIN_*` in `packages/database/.env.production`, using
     the existing `db:seed` against production's `DATABASE_URL`, run once.
   - Laura's data goes with that drop.
   - `storage-move` copies `allonfire-minio-data` once.
   - Checked by: `https://api.isaiariva.com/ready` answers 200, the Back
     Office's sign-in page loads on `back-office.isaiariva.com`, and
     OpenObserve shows the API's first log lines.
   - Every push to test or prod, and the database replace, stops for the
     owner's yes first.
7. **Laura is dropped, with no backup** (owner's call, irreversible). Its
   Dokploy app (or its service inside a shared compose project, which the
   inventory shows), the `laura.isaiariva.com` record and the `laura-photos`
   bucket go. Its tables already went with step 6's drop. Laura's rebuild
   starts from nothing.
8. **Leftovers and old records go.**
   - Everything the owner ticked in step 2.
   - The old `minio.`, `multica.` and `n8n.` records, each only after the
     new one serves.
   - `allonfire-minio-data`, only after `storage-move` is verified.
9. **Cloudflare's proxy, all of it together**, after the renames, since half
   done is worse than DNS only:
   1. **Proxied** on every record that points at `188.245.174.30`, at once.
      `observe.` is included.
   2. **SSL/TLS mode "Full (strict)".**
   3. **Hetzner firewall** (`hcloud`): ports 80 and 443 only from
      Cloudflare's published IP ranges (cloudflare.com/ips, fetched at run
      time). SSH stays as it is.
   4. **Certificate renewal still works through the proxy:** Traefik's
      HTTP-01 challenge on port 80. If it doesn't, Traefik switches to a
      DNS-01 challenge with a Cloudflare API token the owner creates.
   5. **Traefik trusts Cloudflare**, in one planned restart (owner's yes;
      Multica and n8n blink too).
      - Cloudflare's ranges go into the `websecure` entrypoint's
        `forwardedHeaders.trustedIPs`.
      - If `admin-gate@file` is an IP allowlist, it moves to a check that
        still sees the visitor: basic auth, or Cloudflare's real-IP header.
      - The diff is shown before it is applied.
   6. **`API_TRUSTED_PROXY_HOPS` is raised by one**, so the per-IP rate
      limits read the visitor's address, not Cloudflare's. The proof is a
      request through the proxy whose rate-limit key is the caller's IP.

## How outside steps run (owner's choice)

- **A CLI where one exists, each write command shown before it runs:**
  - `gh` for GitHub environments and secrets;
  - `hcloud` (context `vps`) for the firewall;
  - SSH through `/hetzner-ssh` for the inventory and verification;
  - `dig` and `curl` for checks.
- **Cloudflare and Dokploy**, which have no CLI here, are either:
  - **guided**: the plan opens the page, puts the value on the clipboard,
    says exactly what to click, and verifies after; or
  - driven through **`/iso-browser`** on the owner's signed-in tab. When the
    permission guard refuses an admin console, the plan falls back to guided
    mode.
- **Every irreversible or outward step stops for the owner's yes:** a
  delete, a DNS change, a push to test or prod, the DB replace, a firewall
  change.

## Changes to the other plans

- **Plan A** loses Task 3a (moved to step 4) and Task 12 (moved to step 1).
  Its stop before mandatory telemetry becomes a check: production's
  `telemetry` answers and Dokploy holds the OTLP values.
- **Plan B** gains the Users table and delete refactor from `TODO.md`, as a
  Back Office task. It runs after A has reshaped Add/Edit and the deletion
  tests: split by concern, browser tests green, delete stays the
  `deleteUsers` action.
- **`TODO.md`** keeps only Laura's Tailwind canonical rewrite, under "Laura
  rebuild". It can't run until Laura is rebuilt. Laura's rebuild will also
  need its own new production setup, since this plan removes it entirely.

## Non-goals

- Umami (analytics) in production.
- Rebuilding Laura.
- No new server and no Dokploy upgrade. The only new public hostnames are
  `api.`, `cdn.` and `observe.`.

## Anti-goals

- **An address production still uses, deleted before its replacement
  serves.**
- **A half-proxied IP:** one DNS-only record left on `188.245.174.30` gives
  the origin away for all of them.
- **A secret value typed by the agent:** every value comes from the owner.

## Constraints

- The repo rules hold for every repo change (AGENTS.md): tests first, Biome
  and TypeScript clean, and no `biome-ignore`, `@ts-expect-error` or
  `@ts-ignore` added.
- Repo changes are never committed by the plan. The owner runs
  `/iso-commit` before the cascade.
- The GitHub account is IsaiaScope (`gh auth switch` if a call fails).

## Answers after the builder check

Owner's answers:

- **The production database** is dropped and rebuilt empty, then seeded with
  one Admin.
- **Hostnames:** `api.isaiariva.com` for the API and `cdn.isaiariva.com` for
  the image server.
- **Traefik's config may change**, with one planned restart.
- **The env files** are `.env.production` per package. The Back Office's
  lives in `env/`.

My calls (the owner can overrule):

- **The OpenObserve ingestion token** can exist only once OpenObserve runs.
  So the first deploy ships with telemetry optional, as the API reads it
  today, but with the API's and the Back Office's `OTEL_*` already wired in
  the compose (no `:?` yet). The plan then:
  1. waits for the owner to create the service account in OpenObserve's UI;
  2. stores its basic auth in the env file, then in Dokploy;
  3. redeploys, with the owner's yes;
  4. checks that the API's first log lines appear.

  Plan A then makes the variables required.
- **OpenObserve gets its own storage user**, limited to the `telemetry`
  bucket, as ADR 0006's separate `OO_S3_*` keys intend. A one-shot
  `telemetry-init` creates it with the storage image's own `mc`: it makes the
  bucket, the user and a bucket-only policy. `packages/storage` is untouched.
- **Production Redis:** if the inventory finds no Redis that Dokploy already
  runs, the prod compose gains a `redis` service (purpose-named,
  memory-capped, internal network only).
- **Firewall:** only ports 80 and 443 change. Every other existing rule (SSH,
  Dokploy's panel, Tailscale, Beszel) stays exactly as the inventory found
  it. If `DOKPLOY_URL` goes through a host being proxied, `deploy.yml`'s
  redeploy call is re-checked after the proxy goes on.
