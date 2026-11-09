# VPS

The one Hetzner server: hardware, access, every service on it, Cloudflare, monitoring, placeholders. AllOnFire's delivery: `deployment.md`. Security: `vps-security.md`. Backups: `vps-backups.md`. n8n: `vps-workflow.md`. Hermes: `vps-agent.md`. Other apps: `vps-other-apps.md`.

## Server

- Hetzner `cax21`: 4 vCPU arm64, 8 GB RAM, 80 GB disk, no swap, location `fsn1`, IPv4 `<vps-ip>`, server name and hostname `main`.
- Ubuntu 24.04 LTS, Docker 28 in Swarm mode (Dokploy's services run as Swarm services; compose projects as plain containers).
- Build images for `linux/arm64`: an amd64-only image does not run.
- Hetzner firewall `vps-firewall` in front (`vps-security.md`). Weekly snapshots, 4 kept (`vps-backups.md`).

## Access

- `ssh main-vps` (alias in `~/.ssh/config.d/hetzner`): user `<ssh-user>`, port `<ssh-port>`, ed25519 key only, passwordless sudo. The `/hetzner-ssh` skill opens it and checks `hostname` is `main`; `~/.config/hetzner/hetzner.json` is the roster the hetzner skills read.
- Dokploy (v0.30): `ssh -L 3000:127.0.0.1:3000 main-vps`, then `http://localhost:3000`; also `panel.isaiariva.com` behind `panel-auth@file` (`deployment.md` for the CI login).
- Dokploy's API key for the owner: `~/.config/dokploy-api.conf` (`<dokploy-api-key>`).
- Dokploy owns `/etc/dokploy/`: `/etc/dokploy/compose/` and `/etc/dokploy/applications/` (one folder per project), `/etc/dokploy/traefik/traefik.yml` (static), `/etc/dokploy/traefik/dynamic/` (file routes, middlewares, `acme.json`).
- A Swarm container is named `<service>.1.…`: find it with `docker ps --format '{{.Names}}' | grep -m1 <name>`, never type the suffix.

## Services

One line each: what, Dokploy project or compose, host, guide. Hosts are all under `isaiariva.com`.

- AllOnFire API, Back Office, `redis`, `storage`, `telemetry`, `image-server`, `cdn`: compose `applications-allonfire-…`; `api.`, `back-office.`, `storage.` (`admin-gate`), `observe.` (own login), `cdn.`; `deployment.md`.
- Workflow (n8n 2.26): Swarm service `applications-n8n-…`; `workflow.`; data in Dokploy's Postgres + volume `n8n-data`; `vps-workflow.md`.
- Dokploy: `dokploy`, `dokploy-postgres` (Postgres 16, the shared database: `allonfire`, `monorepoonfire`, `n8n`, `dokploy`), `dokploy-redis` (Dokploy's own, never shared), `dokploy-traefik` (Traefik v3, the only listener on 80/443); `panel.`.
- MonorepoOnFire (portfolio): Dokploy application `monorepoonfire-…`, port 3075; `www.`, bare domain 301 to `www.`; `vps-other-apps.md`.
- Multica (agent work board): compose `applications-multica`, own Postgres; `board.`; `vps-other-apps.md`.
- Adminer: compose `infrastructure-adminer`; `database-console.` (`admin-gate`); `vps-other-apps.md`.
- Beszel (monitoring): compose `infrastructure-beszel`, hub + agent; `monitor.` (own login); `vps-other-apps.md`.
- Hermes agent: container `sofia`, compose `ai-agent-sofia`; `sofia.` (`sofia-gate`, rate limit, noindex); `vps-agent.md`.
- `laura.`: proxied, answers 404 until Laura's rebuild (`laura.md`).

## Cloudflare

- Every record on `<vps-ip>` is proxied (orange cloud), SSL/TLS Full (strict); the firewall lets only Cloudflare's ranges reach 80 and 443, so the direct IP times out.
- A host on the VPS needs: a proxied A record, a Traefik route (Dokploy domain or a file in `/etc/dokploy/traefik/dynamic/`), a Let's Encrypt cert (HTTP-01 through the proxy). Details, cache rule on `cdn.`, trusted proxies: `deployment.md`.
- Records for other servers stay DNS only (media: Cloudflare's CDN terms).

## Monitoring

- Beszel at `monitor.`: host and container metrics (CPU, RAM, disk, network), history in its PocketBase data (backed up as `beszel-data`).
- UptimeRobot (free, external, 5-minute HTTP checks, email): catches a VPS that is fully down, which Beszel cannot report. Its monitor list lives in the UptimeRobot account.
- Telemetry of the Apps: OpenObserve at `observe.` (`deployment.md`).
- Backup and crash notices: Telegram through the Workflow service (`vps-workflow.md`).
- Quick checks on the server: `docker stats --no-stream`, `free -h`, `df -h /`.

## Placeholders

Tracked files carry placeholders; the real values live here.

| Placeholder | Real value lives in |
|---|---|
| `<vps-ip>`, `<ssh-port>`, `<ssh-user>` | `~/.ssh/config.d/hetzner` (host `main-vps`); `~/.config/hetzner/hetzner.json` (chezmoi) |
| `<hcloud-token>`, `<hetzner-server-id>` | `~/.config/hcloud/cli.toml` (chezmoi, encrypted); server `/opt/backups/.env` |
| `<dokploy-api-key>` | `~/.config/dokploy-api.conf` (chezmoi, encrypted) |
| `<backup-bucket>`, `<backup-iam-user>`, AWS keys | server `/opt/backups/.env`, `~/.aws/credentials` |
| `<age-public-key>` / age private key | server `/opt/backups/.env` / password manager only |
| `<backup-webhook-path>`, `<backup-webhook-token>` | n8n workflow; server `/opt/backups/.env` (`BACKUP_WEBHOOK_URL`, `BACKUP_WEBHOOK_TOKEN`) |
| `<telegram-chat-id>` | server `/opt/backups/.env` (`BACKUP_TELEGRAM_CHAT_ID`); n8n |
| `<credential-id>`, `<webhook-id>` | n8n (read by `vps/workflows.sh import`) |
| `<beszel-webhook-path>` | Beszel UI, notification settings |
| `<owner-email>` | password manager |
| `<task-id>`, `<dokploy-org-id>`, `<dokploy-user-id>`, Dokploy suffixes (`…`) | read live from Docker / Dokploy |

Mirror of the server's `/opt/backups/.env`: git-ignored `vps/.env.production`, read only through `pnpm env:prod` (`vps-backups.md`).

## Where things live

- Knowledge: these `vps*.md` guides, plus `deployment.md` for AllOnFire's side.
- What runs on the server: the root `vps/` folder (no Markdown). `backup.sh`, `restore-test.sh`, `hetzner-snapshot.sh`, `.env.example`: `vps-backups.md`. `workflows.sh` and `vps/workflows/`: `vps-workflow.md`.
- Their tests: `packages/config/local/tests/backup-scripts.test.ts`, `workflows.test.ts`; the `vps/` folder is a `test` input in `packages/config/turbo.json`, and reaches no Deploy unit.
- On the server: `/opt/backups/` (scripts, `.env`, staging, logs), `/etc/dokploy/`, `/etc/cron.d/backup-schedule`.

## History and gotchas

- 2026-02-27: plan to move MonorepoOnFire off Railway (Turso DB) and add n8n and utility apps on one Hetzner `cax11` (2 vCPU, 4 GB) with Dokploy, about 4 EUR a month.
- 2026-02-28: `cax11` created in `fsn1`, Ubuntu 24.04, Dokploy installed (one-line installer, single-node Swarm), shared Postgres is Dokploy's own `dokploy-postgres`.
- 2026-03: MonorepoOnFire moved from Railway and Turso to the VPS and the shared Postgres; DNS cut over with TTL lowered to 300 s first, records DNS only (grey cloud) then.
- 2026-03: UptimeRobot monitors created for the hosts of the time (`www.`, `n8n.`, `panel.`, `db.`, `monitor.`); two were renamed in 2026-10, so check the list against `workflow.` and `database-console.`.
- 2026-04: upgraded live to `cax21` (8 GB) for AllOnFire; Hetzner resizes in place.
- 2026-10: purpose-name hosts: `db.` became `database-console.`, `minio.` `storage.`, `multica.` `board.`, `n8n.` `workflow.`; the old records are gone.
- 2026-11-02: every record proxied through Cloudflare, firewall narrowed to Cloudflare's ranges, SSL Full (strict).
- Gotcha: `docker restart` on a Swarm task leaves an orphan beside the replacement; restart a Swarm service with `docker service update --force <service>`.
