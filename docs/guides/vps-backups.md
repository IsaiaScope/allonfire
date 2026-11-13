# VPS backups

What the VPS backs up, where it goes, how to change the scripts, the restore drill and disaster recovery. Scripts: `vps/backup.sh`, `vps/restore-test.sh`, `vps/hetzner-snapshot.sh` (usage and exit codes in their headers). Env keys: `vps/.env.example`. Notices: `vps-workflow.md`.

## What runs and when

- `/etc/cron.d/backup-schedule` (server time, as root):
  - `0 2 * * *` `backup.sh` (tier picked by date: 1st of the month `monthly`, Sunday `weekly`, else `daily`), log `/opt/backups/logs/backup.log`.
  - `0 3 * * 0` `hetzner-snapshot.sh`: Hetzner snapshot `auto-backup-<date>`, prunes to `BACKUP_KEEP_SNAPSHOTS` (4), log `snapshot.log`.
- Logs are root's, so a manual run that should log: `ssh main-vps 'sudo bash -c "/opt/backups/scripts/backup.sh weekly >> /opt/backups/logs/backup.log 2>&1"'`.
- Flags: `--dry-run` (no upload, no notice, staging kept), `--test-notify` (sends a synthetic manifest, exits).
- Tools on the host, not in containers: `awscli`, `age`, `jq`, `sqlite3`, `hcloud`.
- `/opt/backups/`: `.env`, `/opt/backups/scripts/` (mode 711), `/opt/backups/staging/<date>/` (kept `BACKUP_LOCAL_RETENTION_DAYS`, 2), `/opt/backups/status/`, `/opt/backups/logs/`.

## The 13 components

Each becomes `<name>.<ext>.age` except `storage-data`. Weekly run 2026-11-02: 193.2 MB.

- `postgres-all`: `pg_dumpall` of `dokploy-postgres`, every database (`allonfire`, `monorepoonfire`, `n8n`, `dokploy`); SQL text.
- `n8n-data`: n8n's volume (`/home/node/.n8n`: binary data, community nodes, its own config), stale SQLite files left out.
- `dokploy-config`: `pg_dump --format=custom` of the `dokploy` database (projects, services, domains, env values).
- `multica-postgres`: `pg_dump --format=custom` of Multica's own Postgres.
- `multica-uploads`: Multica's `backend_uploads` volume, tarred with BusyBox inside the backend image.
- `server-config`: `sshd_config`, `sysctl.d`, CrowdSec and bouncer keys, `daemon.json`, cron files and crontabs, `traefik.yml`, unattended-upgrades, needrestart, `modprobe.d`, `authorized_keys`, and `/opt/backups/.env` plus `/opt/backups/scripts/` (the backup backs itself up).
- `ssl-certs`: `acme.json` (restoring it avoids Let's Encrypt rate limits).
- `traefik-dynamic-config`: every `.yml` in `/etc/dokploy/traefik/dynamic/`.
- `beszel-data`: the Beszel hub's PocketBase data, copied out with `docker cp` (the image has no tar).
- `agent-state`: Hermes' state, see below.
- `dokploy-apps-config`: `/etc/dokploy/{compose,applications,ssh}`; the largest file by far.
- `system-metadata`: dpkg selections, pip packages, Docker networks, volume list (a reference for a rebuild).
- `storage-data`: the weekly storage mirror, see below; no file of its own.

## S3

- Bucket `<backup-bucket>` (`eu-central-1`, public access blocked, SSE-S3, no versioning), written by IAM user `<backup-iam-user>` (Put, Get, List, Delete on this bucket only).
- Layout: `<tier>/<date>/` holds the 12 `.age` files plus `manifest.json` (unencrypted, no secrets); `minio-mirror/` holds the storage mirror.
- Storage class Glacier Instant Retrieval (instant reads, cheap storage).
- Lifecycle: `daily/` expires after 8 days, `weekly/` 30, `monthly/` 95. `minio-mirror/` is in no rule and never may be: it holds one copy per file, the only copy of a deleted picture.
- Latest date: `aws s3 ls s3://<backup-bucket>/daily/ | tail -1`.

## The storage mirror

- Weekly and monthly runs `docker cp` the AllOnFire `storage` container's `/data` (found by `BACKUP_STORAGE_CONTAINER_PATTERN`, the purpose name) and `aws s3 sync` it to `s3://<backup-bucket>/minio-mirror/`. Daily runs skip it (`daily_skip`, not a failure).
- Raw files, not age-encrypted: their only protection is the private bucket. The whole volume goes, `telemetry` bucket and MinIO's `.minio.sys` included.
- No `--delete`: the mirror only grows and keeps pictures deleted in the App. Purging is by hand.
- `/opt/backups/status/last-minio-sync` (`<date> <bytes>`) lets a daily manifest report the mirror's age; the manifest's `storage` object carries it.
- The prefix `minio-mirror/` and the status file keep their old names on purpose: renaming the prefix would re-upload the whole mirror.
- 2026-11-02: 2,702 objects, 94 MB.

## Encryption

- `age`: `backup.sh` encrypts with `BACKUP_AGE_PUBLIC_KEY` (`<age-public-key>`) on the server.
- The private key lives only in the password manager. It is on the server only during a restore drill, at `BACKUP_AGE_PRIVATE_KEY_PATH`, then shredded.
- Keep the AWS keys and the hcloud token in the password manager too: `server-config` holds `.env`, but reading it needs the AWS keys first.
- By hand: `age -d -i key.txt -o <file> <file>.age`.

## Notices

- At the end `backup.sh` POSTs `manifest.json` to `BACKUP_WEBHOOK_URL` (`https://workflow.isaiariva.com/webhook/<backup-webhook-path>`) with header `X-Backup-Token: <backup-webhook-token>`; empty URL skips it, a failed POST only logs a warning.
- Manifest: `date`, `timestamp`, `tier`, `status`, `total_size_bytes`, `storage{status,last_sync,age_days,files_uploaded,mirror_bytes}`, `components[{name,file,size,status}]`, `errors[]`, `s3_prefix`. The Workflow service reads it; changing a field breaks the message silently (`vps-workflow.md`).
- `status`: `success` (0 errors, exit 0), `partial_failure` (1 to 8, exit 1), `total_failure` (9 or more, exit 2).
- `total_size_bytes` counts local files only: the mirror adds 0 even on a sync week.
- `errors[]` is joined into JSON without escaping: push only fixed literal strings, never command output.

## Env keys

- Every key starts with `BACKUP_`; the list and comments: `vps/.env.example`, written like the other `.env.example` files: blocks by owner (Agent, Age encryption, Containers, Hetzner Cloud, Keep-alive, Notification, PostgreSQL, Retention, S3, SSL certificates, Telegram), each headed by `# Name`, keys in alphabetical order inside a block.
- `vps/.env.production`: git-ignored mirror of the server's `/opt/backups/.env`, in the example's shape (the server's own file may keep its older order: only the key names must match). Read it only through `pnpm env:prod` (`keys`, `check`, `copy`; `packages/config/local/env-production.sh`). Refresh it after any change on the server, without printing a value.

## Installing a script change

1. Change the script in `vps/`; `pnpm --filter @allonfire/config exec vitest run local/tests/backup-scripts.test.ts`.
2. `scp vps/{backup.sh,restore-test.sh,hetzner-snapshot.sh} main-vps:/opt/backups/scripts/`
3. `ssh main-vps 'chmod 711 /opt/backups/scripts/*.sh'`
4. Key names match: `diff <(ssh main-vps "cut -d= -f1 /opt/backups/.env | grep -v '^#' | grep . | sort") <(cut -d= -f1 vps/.env.example | grep -v '^#' | grep . | sort)` prints nothing. A missing key fails the run at its `:?` check.
5. `ssh main-vps 'sudo /opt/backups/scripts/backup.sh --dry-run daily'`: exit 0, every component `ok` (storage `daily_skip`).
6. `ssh main-vps 'sudo /opt/backups/scripts/backup.sh --test-notify'`: the Telegram message arrives (failure branch, `status: test`).
7. A new key: on the server with `sed` on the key name only, in `vps/.env.example`, and in `vps/.env.production`.

## Restore drill

1. Owner puts the age private key at the server's `BACKUP_AGE_PRIVATE_KEY_PATH`, `chmod 600`.
2. `ssh main-vps 'sudo /opt/backups/scripts/restore-test.sh weekly'` (tier optional, default `daily`): downloads the latest date, decrypts every `.age`, checks Postgres dumps by header and archives with `tar -tzf`, and checks the mirror exists and is at most 9 days old. Exit 0 = all OK.
3. `ssh main-vps 'sudo shred -u "$(sudo grep ^BACKUP_AGE_PRIVATE_KEY_PATH= /opt/backups/.env | cut -d= -f2)"'`, check the file is gone.
4. Add a dated History line with the result.

## Disaster recovery

Fast path, from a snapshot (about 15 minutes):
1. Hetzner Console, Images, latest `auto-backup-<date>`, Create Server (`cax21`, `fsn1`), attach `vps-firewall`.
2. Point the Cloudflare A records at the new IP (keep them proxied); update `~/.ssh/config.d/hetzner` and `~/.config/hetzner/hetzner.json`.

Full path, from S3 (one to two hours; needs the age key, AWS keys, hcloud token):
1. `hcloud server create --name main --type cax21 --image ubuntu-24.04 --location fsn1`; attach `vps-firewall`.
2. User, sshd, CrowdSec as in `vps-security.md`; `curl -sSL https://dokploy.com/install.sh | sh`.
3. `sudo apt install -y awscli age sqlite3 jq`, hcloud's arm64 release into `/usr/local/bin`, `aws configure`.
4. `aws s3 cp s3://<backup-bucket>/<tier>/<date>/ /tmp/restore --recursive`; key to `/tmp/restore/key.txt`; `for f in *.age; do age -d -i key.txt -o "${f%.age}" "$f"; done`.
5. Configs before services: `tar -xzf` `server-config`, `traefik-dynamic-config`, `ssl-certs`, `dokploy-apps-config` with `-C /`; restart `sshd`, `crowdsec`, `crowdsec-firewall-bouncer`.
6. Dokploy's database: `docker cp` `dokploy-config.dump` into `dokploy-postgres`, `pg_restore -U dokploy --clean --if-exists -d dokploy`.
7. The other databases: `docker cp` `postgres-all.dump` in, `psql -U dokploy -f postgres-all.dump`.
8. Redeploy every service from Dokploy.
9. Multica: `pg_restore` `multica-postgres.dump` into its Postgres; untar `multica-uploads` into its uploads volume.
10. n8n: untar `n8n-data` into `/home/node/.n8n`, then `docker service update --force applications-n8n-…`.
11. Beszel: stop the hub, untar `beszel-data` into its `/beszel_data` volume, start it.
12. Hermes: untar `agent-state`; its `ai-agent-sofia-state/_data` folder goes into that volume, its `ai-agent` folder into `/home/<ssh-user>/`; start `sofia` (caches rebuild).
13. Storage: `aws s3 sync s3://<backup-bucket>/minio-mirror/ <dir>`, `docker cp <dir>/. <storage container>:/data/`, restart it; deleted pictures come back too.
14. Compare `dpkg --get-selections` with `system-metadata`; `docker ps` shows every service up.
15. Cloudflare A records to the new IP; `backup.sh --dry-run daily`; shred the key and `/tmp/restore`.

## Agent state

- Volume `ai-agent-sofia-state` (`BACKUP_AGENT_VOLUME`) plus the folder `/home/<ssh-user>/ai-agent` (`BACKUP_AGENT_DIR`), in one archive.
- State only: the caches the agent rebuilds (`AGENT_CACHES` in `backup.sh`, about 2.5 of the volume's 2.6 GB) stay out; the archive is about 120 MB.
- The agent's SQLite files change while tar reads them: tar's exit 1 ("file changed") counts as ok, exit 2 or more fails.

## Guard tests

- `packages/config/local/tests/backup-scripts.test.ts`: every key `BACKUP_`, no pre-rename key, every `:?` key in `.env.example`, storage found by purpose name, agent state backed up and verified, tar exit 1 accepted, restore checks by header, the manifest names the mirror `storage`.
- `packages/config/local/tests/workflows.test.ts`: the n8n exports carry only placeholders, and every manifest field the backup message reads is one `backup.sh` writes.

## History and gotchas

- 2026-03-04: backups set up: S3 Glacier IR plus age, host cron, weekly Hetzner snapshots; n8n read the manifest from a bind mount at 02:30 and sent Telegram.
- 2026-03: never built: a custom n8n image with backup tools and n8n workflows running backups or a monthly restore test; cron and host tools do it.
- 2026-08-05: 12 components (Multica's database and uploads and the weekly storage mirror added); `backup.sh` POSTs the manifest to the webhook with `X-Backup-Token` instead of the bind mount; anonymous calls get 403.
- 2026-10-25: last good storage mirror; the container was renamed to its purpose name (`…-storage-1`) and `backup.sh` grepped `minio`; the 2026-11-01 mirror failed. Fixed 2026-11-02 (purpose-name pattern).
- 2026-10-31: backup notices failed; the webhook host `n8n.` was gone, n8n answers on `workflow.`; `BACKUP_WEBHOOK_URL` host changed.
- 2026-11-02: storage found by purpose name; Hermes `agent-state` added (13 components); `cron-fallback.sh` removed (nothing scheduled it; its marker `/opt/backups/status/last-backup-<date>` is still written, nothing reads it); env keys prefixed `BACKUP_`; manifest `minio` became `storage` and `minio-data` `storage-data`.
- 2026-11-02: restore checks fixed: `postgres-all` looked for "PostgreSQL" on line 1 but `pg_dumpall` writes `--` first; `dokploy-config` called `pg_restore`, which the host lacks; both check headers now.
- 2026-11-02: restore drill 13/13 OK (mirror 2,702 objects, 94 MB). Pre-change scripts and `.env` kept at `/opt/backups/pre-knowledge-base-2026-11-02/`.
- Gotcha: `find_container` takes the first `grep -m1` match; a pattern must match exactly one container.
