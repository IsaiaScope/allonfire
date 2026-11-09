# Knowledge Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the VPS backups and version the n8n workflows that send their messages, then turn every piece of VPS and project knowledge, including the code, folder and naming conventions extrapolated from what is built, into short, pointer-style guides in `docs/guides/`, with every sensitive value replaced by a placeholder.

**Status:** implemented (uncommitted) @ 2026-11-02T18:08:15Z

**Architecture:** The backup scripts move into a root `vps/` folder (not a package, nothing imports it), which becomes the source of truth for `/opt/backups/scripts/` on the VPS. A text-level vitest guards them. A read-only live inventory feeds six flat `vps*.md` guides. An audit of READMEs, superpowers files, config and Claude memory turns into one-line pointers in the owning guides. `AGENTS.md` lists every guide.

**Tech Stack:** bash (server scripts), vitest (text checks), Markdown, ssh (`main-vps`), chezmoi.

**Spec:** `docs/superpowers/specs/2026-11-02-knowledge-base-design.md`

## Global Constraints

- The repo is public. No real IP, SSH port, bucket name, IAM user, email, token, webhook path or internal ID goes into a tracked file. Placeholders follow the spec's table.
- Never print a secret value: not in chat, not in a log, not in a file. On the server, read and edit only key names (`cut -d= -f1`, `sed` on `^KEY=`).
- Security items that are only the owner's business never go in a tracked file. Note them for the final report instead.
- The VPS is touched only in Tasks 2 and 3. Every other server command is read-only.
- No skill edits. Changes stay in this repo, plus chezmoi in Task 11.
- Guides are flat files in `docs/guides/`. `docs/agents/` holds only `domain.md`, `issue-tracker.md` and `triage-labels.md`.
- All VPS documentation lives in `docs/guides/vps*.md`. The root `vps/` folder holds only what runs on the server (scripts, `.env.example`, workflow exports): no README and no Markdown. The guides point to it.
- Guide shape: a `#` title, one line of scope and pointers, dense dot-list sections for the current state, then `## History and gotchas` with one line each, `YYYY-MM-DD: symptom; cause; fix.`
- Use purpose names, never software names, in file names and new env keys (`workflow` for n8n, `agent` for Hermes, `storage` for MinIO).
- Every env key the backup scripts read starts with `BACKUP_`.
- Do not commit. The owner commits with `/iso-commit`. Work stays on `feat/instant-users-navigation`.
- A test file's first line is `// @module-tag unit`. Use Vitest globals; no `from "vitest"`, no `as` casts.

## Review Focus

1. **The manifest shape must not change.** The n8n workflow parses `backup.sh`'s JSON (`minio`, `components[].name` such as `minio-data`). Keep every existing key and component name, and only add `agent-state`. Tasks 1 and 1b assert it; Task 1b's contract test checks every field the workflow reads.
2. **A renamed key missed on the server makes the run fail at `:?`.** Task 2 diffs the server `.env` key names against `.env.example` before the dry run.
3. **The storage pattern can match the wrong container.** `find_container` uses `grep -m1`, so the pattern has to be specific enough to hit `applications-allonfire-…-storage-1` and nothing else. Task 2 checks it on the server.
4. **A placeholder sweep can miss a value.** Task 9 greps for the real values, read at runtime from `~/.ssh/config.d/hetzner` and the server, so they are never typed into the repo.
5. **A pointer can name a path that doesn't exist.** Task 11's link check covers every backticked repo path in `docs/guides/*.md` and `AGENTS.md`.

---

## Phase 1: Backups

### Task 1: Scripts move into the repo, renamed keys, two new parts

**Files:**
- Create (by `mv` from `docs/guides/vps/scripts/`): `vps/backup.sh`, `vps/restore-test.sh`, `vps/hetzner-snapshot.sh`, `vps/.env.example`
- Delete: `docs/guides/vps/scripts/cron-fallback.sh`
- Test: `packages/config/local/tests/backup-scripts.test.ts`

**Interfaces:**
- Produces: the key rename table below, which Task 2 applies to the server `.env`. Also two new components, `agent-state` (age-encrypted tarball) and storage found by `BACKUP_STORAGE_CONTAINER_PATTERN`.

Key renames (old to new):

| Old | New |
|---|---|
| `AWS_S3_BUCKET` | `BACKUP_S3_BUCKET` |
| `AGE_PUBLIC_KEY` | `BACKUP_AGE_PUBLIC_KEY` |
| `AGE_PRIVATE_KEY_PATH` | `BACKUP_AGE_PRIVATE_KEY_PATH` |
| `PG_CONTAINER_PATTERN` | `BACKUP_PG_CONTAINER_PATTERN` |
| `PG_USER` | `BACKUP_PG_USER` |
| `N8N_CONTAINER_PATTERN` | `BACKUP_WORKFLOW_CONTAINER_PATTERN` |
| `N8N_WEBHOOK_URL` | `BACKUP_WEBHOOK_URL` |
| `DOKPLOY_PG_CONTAINER_PATTERN` | `BACKUP_DOKPLOY_PG_CONTAINER_PATTERN` |
| `DOKPLOY_PG_USER` | `BACKUP_DOKPLOY_PG_USER` |
| `DOKPLOY_PG_DATABASE` | `BACKUP_DOKPLOY_PG_DATABASE` |
| `HCLOUD_TOKEN` | `BACKUP_HCLOUD_TOKEN` |
| `HETZNER_SERVER_ID` | `BACKUP_HETZNER_SERVER_ID` |
| `ACME_JSON_PATH` | `BACKUP_ACME_JSON_PATH` |
| `LOCAL_RETENTION_DAYS` | `BACKUP_LOCAL_RETENTION_DAYS` |
| `KEEP_SNAPSHOTS` | `BACKUP_KEEP_SNAPSHOTS` |
| `BACKUP_WEBHOOK_TOKEN` | unchanged |
| new | `BACKUP_STORAGE_CONTAINER_PATTERN=allonfire-.*-storage-` |
| new | `BACKUP_AGENT_VOLUME=ai-agent-sofia-state` |
| new | `BACKUP_AGENT_DIR=/home/main-user/ai-agent` |

- [x] **Step 1: Move the files.** `mkdir -p vps && mv docs/guides/vps/scripts/{backup.sh,restore-test.sh,hetzner-snapshot.sh} vps/ && mv docs/guides/vps/scripts/env.template vps/.env.example && rm docs/guides/vps/scripts/cron-fallback.sh && find vps docs -name '._*' -delete`

- [x] **Step 1b: Wire the root `vps/` folder into CI.** `vps/` is a root folder, not a package; nothing imports it. Add `"$TURBO_ROOT$/vps/**"` to the `test` task `inputs` in `packages/config/turbo.json`, so a script change re-runs the config tests. Then check that a `vps/`-only change reaches no Deploy unit: after Step 1, run `pnpm ci:affected HEAD` with only `vps/` changed. Expected: no App and no Deploy unit listed. If any are listed, exclude `vps/**` the same way `**/*.md` is excluded, and record it in `deployment.md`.
- [x] **Step 2: Write the failing test** `packages/config/local/tests/backup-scripts.test.ts`. It follows `local/tests/service-names.test.ts`: read the files with `readFileSync` and run exact-text checks. Tests:
  - `every .env.example key starts with BACKUP_`: parse `^([A-Z][A-Z0-9_]*)=` lines; each one matches `/^BACKUP_/`.
  - `no script reads a pre-rename key`: none of `backup.sh`, `restore-test.sh`, `hetzner-snapshot.sh`, `.env.example` contains any of the 15 old names from the table above. Match whole words (`\bAWS_S3_BUCKET\b`, …), and leave out `BACKUP_WEBHOOK_TOKEN`.
  - `every key a script requires is in .env.example`: every `${NAME:?` in the three scripts has `NAME` among the `.env.example` keys.
  - `storage is found by its purpose name`: `backup.sh` contains `find_container "$BACKUP_STORAGE_CONTAINER_PATTERN"` and not `find_container "minio"`.
  - `the agent state is backed up and verified`: `backup.sh` contains `record_component "agent-state"`, and `restore-test.sh` contains `verify_component "agent-state"`.
  - `the manifest keeps the shape the workflow parses`: `backup.sh` still contains `"minio": {` and `record_component "minio-data"`.

- [x] **Step 3: Run it to verify it fails.** Run `pnpm --filter @allonfire/config exec vitest run local/tests/backup-scripts.test.ts`. Expected: FAIL on the rename, storage and agent-state tests.

- [x] **Step 4: Implement.**
  - Rename every key in all four files per the table. `hetzner-snapshot.sh` exports `HCLOUD_TOKEN="$BACKUP_HCLOUD_TOKEN"`, since the hcloud CLI reads its own variable (found while implementing; a test pins it).
  - In `restore-test.sh`, rename the internal `BACKUP_DATE` and `BACKUP_STATUS` to `MANIFEST_DATE` and `MANIFEST_STATUS`, so `BACKUP_` names only env keys.
  - `backup.sh` section 10 finds storage with `BACKUP_STORAGE_CONTAINER_PATTERN`. Its log lines say "storage", but the manifest keys stay as they are.
  - Add a section `# ── 7b. Agent state (Hermes) ──` that tars the volume's `_data` and `BACKUP_AGENT_DIR`, each under its own root (adjusted while implementing: two `-C … .` would merge both trees into one root), then `encrypt_file` and `record_component "agent-state"` with the same status values as the other parts.
  - `restore-test.sh` gets `verify_component "agent-state" "${RESTORE_DIR}/agent-state.tar.gz.age" "tar -tzf '${RESTORE_DIR}/agent-state.tar.gz'"`.
  - `.env.example` lists every key in the table. The new keys get the values shown; secret keys get `your-…` placeholders. Drop the comment that says n8n triggers backups (cron does).

- [x] **Step 5: Run it to verify it passes.** Run the same command. Expected: PASS. Also run `bash -n vps/*.sh`, which should print nothing.

### Task 1b: The n8n workflows that send the messages

**Files:**
- Create: `vps/workflows.sh`
- Create (from the first export): `vps/workflows/backup-notification.json` (n8n ID `NRLX4aFGv2uNotfc`) and `vps/workflows/error-alert.json` (n8n ID `KX1CQrEVzEvV747w`)
- Modify: `packages/config/turbo.json` (already in Task 1), `vps/.env.example` (add `BACKUP_TELEGRAM_CHAT_ID=your-chat-id`)
- Test: `packages/config/local/tests/workflows.test.ts`

**Interfaces:**
- Consumes: Task 1's `.env.example` keys (`BACKUP_WEBHOOK_URL`, the new `BACKUP_TELEGRAM_CHAT_ID`).
- Produces: `workflows.sh export`, which writes both JSON files, and `workflows.sh import <file>`, which loads one into n8n. Both run on the Mac and reach n8n through `ssh main-vps`, `docker exec <n8n container> n8n export:workflow|import:workflow`, with `jq` on the Mac.

Placeholders that `export` writes. Values come from the export, never from typing.

| Field | Placeholder |
|---|---|
| `.nodes[].parameters.chatId` | `<telegram-chat-id>` |
| `.nodes[] \| select(.type == "n8n-nodes-base.webhook") .parameters.path` | `<backup-webhook-path>` |
| `.nodes[].webhookId` | `<webhook-id>` |
| `.nodes[].credentials[].id` | `<credential-id>` (`.name` stays) |
| dropped | `updatedAt`, `createdAt`, `versionId`, `activeVersionId`, `shared`, `meta`, `pinData`, `staticData`, `triggerCount`, `isArchived`, `tags` (tag IDs are n8n's own; added while implementing) |

`import` reverses the swaps:
- `<telegram-chat-id>` from the server `.env`'s `BACKUP_TELEGRAM_CHAT_ID`
- `<backup-webhook-path>` from the path part of `BACKUP_WEBHOOK_URL`
- `<credential-id>` by matching `.credentials.<type>.name` against `n8n export:credentials --all`, using `id` and `name` only
- `<webhook-id>` from the workflow that is live now, if there is one, otherwise a new `uuidgen`

`import` then copies the filled file into the container and runs `n8n import:workflow --input=…`. Files and pipes only; no value is echoed. The filled file is removed from the container and from `/tmp` afterwards.

- [x] **Step 1: Write the failing test** `packages/config/local/tests/workflows.test.ts`. It reads both JSON files as text and checks them with regexes, like its neighbours (`@allonfire/config` does not depend on core, so core's JSON helper is out of reach).
  - `no real chat ID, path, webhook ID or credential ID`: every `chatId` is `<telegram-chat-id>`, every webhook `path` is `<backup-webhook-path>`, every `webhookId` is `<webhook-id>`, and every `credentials.*.id` is `<credential-id>`.
  - `no volatile fields`: none of the dropped keys is present at the top level.
  - `the backup message reads only fields backup.sh writes`: collect every `body.<field>` (regex `/\$json\.body\.([a-z_]+)/g` plus `body\[['"]([a-z_]+)`) from `backup-notification.json`, and check that each one appears as `"<field>"` in `backup.sh`.
  - `the env template names the chat ID`: `.env.example` has `BACKUP_TELEGRAM_CHAT_ID=`.
- [x] **Step 2: Run it to verify it fails.** `pnpm --filter @allonfire/config exec vitest run local/tests/workflows.test.ts`. Expected: FAIL, files missing.
- [x] **Step 3: Implement** `workflows.sh` with `set -euo pipefail`, the two subcommands, the IDs above in a `case`, and the placeholder table as `jq` filters. Add `BACKUP_TELEGRAM_CHAT_ID` to `.env.example`.
- [x] **Step 4: First export.** `bash vps/workflows.sh export`, then `find vps -name '._*' -delete`. Check with `grep -cE '"chatId": "-?[0-9]' vps/workflows/*.json`. Expected: `0` for both files.
- [x] **Step 5: Run it to verify it passes.** Run the Step 2 command. Expected: PASS. If the contract test names a field `backup.sh` doesn't write, fix the workflow in n8n's UI (never the manifest), then export again.

### Task 2: Roll the scripts out to the VPS

**Files:** none in the repo. The server's `/opt/backups/` changes.

**Interfaces:**
- Consumes: Task 1's scripts and rename table.

- [x] **Step 1: Connect.** Use the `hetzner-ssh` skill and check that `hostname` prints `main`.
- [x] **Step 2: Save the old files.** `ssh main-vps 'D=/opt/backups/pre-knowledge-base-$(date +%F); sudo mkdir -p $D && sudo cp -a /opt/backups/scripts /opt/backups/.env $D/'`
- [x] **Step 3: Check the storage pattern.** `ssh main-vps 'docker ps --format "{{.Names}}" | grep "allonfire-.*-storage-"'` should print exactly one name, `applications-allonfire-…-storage-1`.
- [x] **Step 4: Install the scripts.** `scp vps/{backup.sh,restore-test.sh,hetzner-snapshot.sh} main-vps:/opt/backups/scripts/`, then `ssh main-vps 'chmod 711 /opt/backups/scripts/*.sh && rm -f /opt/backups/scripts/cron-fallback.sh'`.
- [x] **Step 5: Rename the keys on the server.** One `sed -i` per table row, on the key name only (`s/^AWS_S3_BUCKET=/BACKUP_S3_BUCKET=/`, …). Rename `N8N_WEBHOOK_URL` to `BACKUP_WEBHOOK_URL` and change its host from `n8n.isaiariva.com` to `workflow.isaiariva.com` (`sed -i 's#^BACKUP_WEBHOOK_URL=https://n8n\.isaiariva\.com/#BACKUP_WEBHOOK_URL=https://workflow.isaiariva.com/#'`). Append the three new keys with their values from the table, plus `BACKUP_TELEGRAM_CHAT_ID`. Its value comes from n8n, never typed: run `docker exec <n8n> n8n export:workflow --id=NRLX4aFGv2uNotfc --output=/tmp/w.json` on the server, then `jq -r '[.[].nodes[] | .parameters.chatId // empty][0]'`, append the result to `.env` inside the same remote command, then `rm /tmp/w.json`.
- [x] **Step 6: Diff the key names.** Compare `ssh main-vps "cut -d= -f1 /opt/backups/.env | grep -v '^#' | grep . | sort"` with the same command run locally on `vps/.env.example`. Expected: identical.
- [x] **Step 7: Dry run.** `ssh main-vps 'sudo /opt/backups/scripts/backup.sh --dry-run daily'`. Expected: exit 0, and the manifest lists `agent-state` as `ok`.
- [x] **Step 8: Test notice.** `ssh main-vps 'sudo /opt/backups/scripts/backup.sh --test-notify'`. Expected: HTTP 200, and the owner confirms the Telegram message arrived (ask with AskUserQuestion).
- [x] **Step 9: Real weekly run.** This runs the storage mirror: `ssh main-vps 'sudo /opt/backups/scripts/backup.sh weekly'`. Expected: `"status": "success"`, every component `ok` including `minio-data` and `agent-state`, `minio.last_sync` equal to today, and no `notification failed` line in the log.
- [x] **Step 9b: Workflow round trip.** `bash vps/workflows.sh import vps/workflows/backup-notification.json && bash vps/workflows.sh import vps/workflows/error-alert.json && bash vps/workflows.sh export && git diff --exit-code vps/workflows/` (for untracked files, compare against a copy made before the round trip). Expected: no diff. Both workflows are still `active: true` in `n8n list:workflow` (activate them again with `n8n update:workflow --id=… --active=true` if import turned them off). Then run `--test-notify` again and get the owner's confirmation that the message arrived.
- [x] **Step 10: Snapshot script with the renamed keys.** Run `ssh main-vps 'sudo /opt/backups/scripts/hetzner-snapshot.sh'`. Expected: `{"status":"success",…}`. It prunes back to 4 snapshots.

Done 2026-11-02. Adjusted while implementing:
- The first dry run failed on `agent-state`: the volume is 2.6 GB of caches the agent rebuilds, and tar exits 1 when a live SQLite file changes. The owner chose state only, so `AGENT_CACHES` is excluded (about 120 MB) and tar's exit 1 counts as ok. Tests pin both.
- Cron-style runs need `sudo bash -c "… >> /opt/backups/logs/…"`, because the logs are root's.
- `import` turns a workflow off; `workflows.sh import` now runs `n8n publish:workflow` when the file says `active: true`. The running n8n kept serving the webhook, so no restart. `versionCounter` joined the dropped fields.
- Owner's request: `vps/.env.production` (git-ignored, mode 600) mirrors `/opt/backups/.env` in `.env.example`'s key order, built over ssh without printing a value. Read it only through `pnpm env:prod`.
- Results: weekly run `success`, 13 components, 193.2 MB, storage mirror 12 MB (1,417 files); Telegram "✅ Backup OK" arrived; snapshot `auto-backup-2026-11-02` created, pruned back to 4 plus the new one.

### Task 3: Guided restore drill

- [x] **Step 1:** Ask the owner with AskUserQuestion to place the age private key at the path the server's `BACKUP_AGE_PRIVATE_KEY_PATH` names, using `chmod 600`, and to answer when it's done. Never handle the key yourself.
- [x] **Step 2:** `ssh main-vps 'sudo /opt/backups/scripts/restore-test.sh weekly'`. Expected: exit 0, and every component reported OK, `agent-state` included.
- [x] **Step 3:** `ssh main-vps 'sudo shred -u "$(sudo grep ^BACKUP_AGE_PRIVATE_KEY_PATH= /opt/backups/.env | cut -d= -f2)"'`, then check that the file is gone. Record the date and result for Task 7's History.

Done 2026-11-02. The owner pasted the key in chat; it was matched against the server's public key, used, and shredded twice. Adjusted while implementing:
- The first drill failed two checks that were wrong, not the backups: `postgres-all` looked for "PostgreSQL" on line 1 (`pg_dumpall` writes `--` first), and `dokploy-config` called `pg_restore`, which the host lacks. Both now check headers, like Multica's. A test pins it.
- Owner's request: the mirror is called storage everywhere a person reads it. The manifest's `minio` object became `storage`, and `minio-data` became `storage-data`, in `backup.sh`, `restore-test.sh` and the workflow together (contract test). The S3 prefix `minio-mirror/` and `/opt/backups/status/last-minio-sync` keep their paths, since renaming them would re-upload the mirror.
- Result: 13/13 OK (storage mirror 2,702 objects, 94 MB). A daily run confirmed Telegram reads "🖼 Storage 12 MB · today".
- For the final report: the key is now in the chat transcript, so offer a new age key pair (new backups locked with it; the old key kept to open older backups).

---

## Phase 2: Inventory

### Task 4: Read-only live inventory

**Files:** `/tmp/knowledge-base-inventory.md`, outside the repo and never committed. Key names only, no values.

**Interfaces:**
- Produces: the facts Tasks 5 to 8 write from. Owner-only items go under a `## For the owner only` heading, which Task 12 reports.

- [x] **Step 1:** Over `ssh main-vps`, read and note:
  - `docker ps`, `docker service ls`, `docker volume ls`
  - Dokploy projects: the names of `/etc/dokploy/applications` and `/etc/dokploy/compose`
  - the routers in `/etc/dokploy/traefik/dynamic/*.yml`, hosts and middlewares only, never a `users:` hash
  - `sudo sshd -T | grep -E 'port|permitrootlogin|passwordauthentication|allowusers|pubkeyaccepted|ciphers|kexalgorithms|macs'`
  - `sudo cscli bouncers list` and `sudo cscli collections list`
  - `/etc/apt/apt.conf.d/50unattended-upgrades` (enabled origins)
  - `free -h`, `df -h /`, `uname -m`, `lsb_release -d`
  - `/etc/cron.d/backup-schedule`
- [x] **Step 2:** Locally, read `hcloud firewall describe vps-firewall` (rules only), `hcloud server describe main` (type, location) and `hcloud image list --type snapshot` (count).
- [x] **Step 3:** For every hostname in the Traefik routers, run `dig +short <host>`. Note which ones resolve to Cloudflare and which are dead (`n8n.isaiariva.com` is expected dead).
- [x] **Step 4:** For MonorepoOnFire, the utility apps and Hermes, mark each item in `docs/guides/vps/README.md`'s checklist and in `10-hermes-agent.md` as built, changed or never built, by what the server shows.

Done 2026-11-02 into `/tmp/knowledge-base-inventory.md`. Step 4 (built or never built) is done by the Phase 3 writer, who reads the old docs anyway. Found: `n8n.isaiariva.com` already has no DNS record; CrowdSec runs only the firewall bouncer; Hermes is on the web at `sofia.` behind a gate.

---

## Phase 3: VPS guides

Each task writes one or more guides in the guide shape, from the old `docs/guides/vps/*.md` files and Task 4's notes. The current state comes first. Everything still useful from the old file becomes a History line or a gotcha. Plans never built become `YYYY-MM-DD: never built: <what>.` Real values use the placeholders. Run `find docs -name '._*' -delete` after each write.

### Task 5: `docs/guides/vps.md`

**Files:** Create `docs/guides/vps.md`. Sources: `README.md`, `process.md` sections 1 to 3 and 10 to 11, `04-server-setup.md`, `05-data-migration.md`, `06-dns-cutover.md`.

- [x] **Step 1:** Write these sections:
  - Server: type, arch, size, OS; `ssh main-vps`; passwordless sudo; Dokploy on port 3000 through an SSH tunnel
  - Services: one line per container, saying what it is, which Dokploy project and host it belongs to, and which guide covers it
  - Cloudflare in front of the server
  - Monitoring: Beszel and UptimeRobot
  - The placeholder table from the spec, each row naming where its real value lives
  - Where things live: these guides hold the knowledge; the server's scripts, `.env.example` and n8n workflow exports sit in the root `vps/` folder (pointer to `vps-backups.md` and `vps-workflow.md` for how to use them)
  - History: the Railway/Turso to Hetzner migration, the DNS cutover and the old CAX11 server, one line each
- [x] **Step 2:** Check: `wc -l docs/guides/vps.md` is under 120, and `grep -c '<vps-ip>' docs/guides/vps.md` is at least 1.

### Task 6: `docs/guides/vps-security.md`

**Files:** Create from `07-security.md` and the security parts of `process.md`.

- [x] **Step 1:** Write these sections:
  - Firewall rules (with `<ssh-port>`)
  - sshd settings, as Task 4 read them
  - CrowdSec with the Traefik bouncer
  - Basic-auth gates (`admin-gate@file`, `panel-auth@file`), with a pointer to `deployment.md` for the host list
  - Dokploy 2FA and its recovery SQL, with `<owner-email>`
  - Unattended upgrades
  - Dokploy stores env values unencrypted: how to handle that
  - History and gotchas, such as Beszel's own login looping with basic auth

  Nothing about open weaknesses.

### Task 7: `docs/guides/vps-backups.md`

**Files:** Create from `08-disaster-recovery.md`, `process.md`, Tasks 1 to 3.

- [x] **Step 1:** Write these sections:
  - What runs and when (`/etc/cron.d/backup-schedule`)
  - Each component and what it holds
  - The S3 layout under `<backup-bucket>` and the tiers
  - The storage mirror: raw sync, unencrypted in the private bucket, keeps deleted pictures
  - Age encryption; where the keys live
  - Notifications through `BACKUP_WEBHOOK_URL`, with a pointer to `vps-workflow.md`
  - Installing a script change: the one `scp` command plus the `chmod` from Task 2 Step 4, and the key-name diff from Task 2 Step 6
  - `vps/.env.production`: the git-ignored mirror of `/opt/backups/.env`, read through `pnpm env:prod`; refresh it after a server-side change
  - Restore drill steps
  - Disaster recovery runbook, condensed to numbered one-liners
  - Pointers to `vps/*`
  - History: the 2026-10-25 storage gap (container rename), the 2026-10-31 notice failures (dead `n8n.` host), Hermes added, cron-fallback removed, the `BACKUP_` rename, and the drill date and result

### Task 8: `docs/guides/vps-workflow.md`, `docs/guides/vps-agent.md`, `docs/guides/vps-other-apps.md`

**Files:** Create the three. Sources:
- `vps-workflow.md`: `process.md` (n8n), `07-security.md` (n8n), `08-disaster-recovery.md` (webhook)
- `vps-agent.md`: `10-hermes-agent.md` and Task 4
- `vps-other-apps.md`: `01`, `02`, `03` and `09`, plus Multica, Adminer and Beszel if Task 4 shows them

- [x] **Step 1:** Write each one.
  - `vps-workflow.md` opens with "The Workflow service runs n8n". It covers each active workflow (trigger, branches, message), `workflows.sh export|import` and when to run each, the placeholder list, n8n's data living in Dokploy's Postgres (backed up by `postgres-all`), and History: the inactive Social-era workflows, and the missing Beszel alerts workflow as "never built". Its webhooks appear as `<…-webhook-path>` placeholders.
  - `vps-agent.md` covers the container `sofia`, its mounts, its trust boundary and how it is backed up. It leaves out the rotation line.
  - `vps-other-apps.md` gives each app a block: what it is, where it runs, its data, and History.

### Task 9: Placeholders everywhere, old folder gone

**Files:** Modify `docs/guides/deployment.md` and any tracked file the grep finds. Delete `docs/guides/vps/`.

- [x] **Step 1:** In `deployment.md`, change line 5 to use `<vps-ip>` and `ssh main-vps`. Add one pointer line to `vps.md`, `vps-security.md` and `vps-backups.md`.
- [x] **Step 2:** `rm -r docs/guides/vps`
- [x] **Step 3:** Sweep with the values read at runtime, so they never appear in the repo: the server IP from `ssh -G main-vps`, and the bucket and server ID from the server's `/opt/backups/.env`, plus the old email, bucket, IAM user, Beszel webhook path and Dokploy container ID that the first copy of the VPS docs held (the terms live only in the session; never write them here). `git grep -nwF` over tracked files and `grep -rnwF` over `docs`, `AGENTS.md`, `CONTEXT.md`, `vps` and `packages/config/local` (never `.env.production`). Swap every hit for its placeholder. Done 2026-11-02: the IP in five superpowers files and a server ID in a `hetzner-snapshot.sh` comment became placeholders.
- [x] **Step 4:** No guide, `AGENTS.md` or `vps/` file mentions an owner-only item (a grep for the owner-only wording). Done 2026-11-02: no hits; the plan and spec only state the rule.

---

## Phase 4: Audit and index

### Task 10: Audit to pointers, memory into the repo

**Files:** Modify the owning guides in `docs/guides/`. Memory changes go to `~/.claude/projects/-Volumes-Crucial-4T-repo-allonfire/memory/`.

- [x] **Step 1: READMEs.** Read each of `apps/api`, `apps/laura`, `packages/{auth,config,core,database,design,storage}/README.md`. For anything a guide's reader needs, add one pointer line to that guide, in the form "`<topic>`: `<path>`". Copy nothing. Skip `*-old` packages.
- [x] **Step 2: Superpowers.** Read `docs/superpowers/specs/*` (titles plus Decisions) and skim the plans. A decision that is still true and not in an ADR or guide becomes one line in its guide, ending with a pointer to the spec. Superseded files get nothing.
- [x] **Step 3: Config.** Read `docker/docker-compose.{dev,prod}.yml`, `.github/workflows/*.yml`, `turbo.json` and the root `package.json` `scripts`. Behavior no guide mentions becomes one line plus a pointer in `deployment.md`, `testing.md` or `tooling.md`.
- [x] **Step 4: Memory.** Check each of `project_structure.md`, `project_prompt_generation.md`, `project_deploy_cascade.md`, `project_seo_pwa_patterns.md`, `project_caching_architecture.md`, `reference_gh_account.md`, `reference_stitch_mcp.md` and `reference_tailnet_dev_urls.md` against the code.
  - Still true and not yet in a guide: write it once in the owning guide (`deployment.md`, `back-office.md`, `tooling.md`).
  - Then delete the memory file and its `MEMORY.md` line, in both cases (moved, or stale).
  - `user_*` memories stay. `feedback_*` memories are Task 10b's.
- [x] **Step 5:** A gap with no owning guide becomes its own guide only if it runs past about 10 lines. Otherwise it joins the closest guide.

Done 2026-11-02: 40 pointer or only-here lines across 13 guides, no new guide; 8 memories handled (5 moved, 3 stale, all deleted). Found for the report: `.claude/commands/allonfire-deploy.md` names `ci-prod-gate` (now `ci-branch-gate.yml`); `packages/database/README.md` still lists Laura in Production's start order. The literal SSH port in `deployment.md` became `<ssh-port>`.

### Task 10b: Conventions extrapolated from what is built

**Files:**
- Modify: the owning guides (`conventions.md`, `package-layout.md`, `next-apps.md`, `forms.md`, `api.md`, `testing.md`, `design-system.md`, `database.md`, `images.md`, `laura.md`, `tooling.md`)
- Create, if needed: `docs/guides/code-style.md` (TypeScript, React, CSS) and `docs/guides/writing.md` (comments, docs, user copy)
- Notes, outside the repo: `/tmp/knowledge-base-conventions.md`, with two lists, candidates and violations

**Interfaces:**
- Produces: the candidates and violations lists that Task 12 reports.

The rule format, in every guide: `- <rule, imperative>. Example: \`<path>\`.` One line, no restating of a lint rule.

- [x] **Step 1: Authorities first.** Move each feedback memory named in the spec's conventions section into its owning guide as convention lines, keeping its **Why** as a few words only if the rule is surprising without it. Then delete the memory file and its `MEMORY.md` line. The agent-workflow memories named there stay.
- [x] **Step 2: Lint and config.** Read `biome.jsonc`, `.oxlintrc.json` and `packages/config/typescript/*.json`. Add one pointer line to `code-style.md` or `testing.md` that says which file enforces what. Name only the non-default rules a reader would trip on.
- [x] **Step 3: Repo skills.** Read `.claude/skills/aof-design/SKILL.md` and `.claude/skills/aof-documentation/SKILL.md` (the vendored framework skills are skipped). A rule that applies outside the skill's own run becomes a pointer line in its guide.
- [x] **Step 4: Code patterns.** Sweep one area at a time, so each sweep fits in context:
  1. folders and file names in `apps/*/src` and `packages/*/src`
  2. exports and `package.json` `exports`
  3. TypeScript: types, zod, generics, constants objects
  4. React: Server and Client components, props, `cva` and `cn`, composition
  5. Next: actions, caching, metadata, errors
  6. API: routes, guards, problem documents, i18n
  7. tests: tags, location, names, fixtures
  8. CSS: tokens, responsive, Safari

  Write a pattern as a convention when it repeats in 3 or more places with no counterexample. Put a weaker pattern on the candidates list, with its places and counterexamples. Code that breaks an authority rule (Steps 1 to 3, or an existing guide line) goes on the violations list as `path:line: <rule>`.
- [x] **Step 5: No duplicates.** `grep -h '^- ' docs/guides/*.md docs/agents/*.md | sort | uniq -d`. Expected: no output. If a rule appears in two guides, keep it in the owner and point to it from the other.

Done 2026-11-02: 28 rule memories moved into guides and deleted (17 agent-workflow memories stay); new `code-style.md` (tool pointers, TypeScript, React, CSS) and `writing.md` (docs, READMEs, PRs); purpose names in `conventions.md`. Code sweep: no casts outside core's typed wrappers, one sanctioned `biome-ignore` (database entry barrel), kebab-case file names except generated shadcn. Candidates and violations in `/tmp/knowledge-base-conventions.md`, reported to the owner.

### Task 11: AGENTS.md, links, chezmoi

**Files:** Modify `AGENTS.md`. Chezmoi changes `~/.ssh/config.d/hetzner` and `~/.config/hetzner/hetzner.json`.

- [x] **Step 1:** The `AGENTS.md` table gets one row per file in `docs/guides/` and `docs/agents/`. The heading says where each folder lives. Replace the old `vps/README.md` row with rows for `vps.md`, `vps-security.md`, `vps-backups.md`, `vps-workflow.md`, `vps-agent.md` and `vps-other-apps.md`.
- [x] **Step 2: Row check.** `for f in docs/guides/*.md docs/agents/*.md; do grep -qF "$(basename $f)" AGENTS.md || echo "MISSING $f"; done`. Expected: no output.
- [x] **Step 3: Link check.** `grep -ohE '\`[a-zA-Z0-9_./-]+\.(md|ts|tsx|sh|yml|yaml|json|template)\`' AGENTS.md docs/guides/*.md docs/agents/*.md | tr -d '\`' | sort -u | while read p; do [ -e "$p" ] || [ -e "docs/guides/$p" ] || [ -e "docs/agents/$p" ] || [ -e "docs/adr/$p" ] || echo "BROKEN $p"; done`. Fix every real `BROKEN` line. Names of server or home paths that only look like repo paths are fine.
- [x] **Step 4: Chezmoi.**
  - Run `chezmoi add ~/.ssh/config.d/hetzner`.
  - In `~/.config/hetzner/hetzner.json`, change the `main` server's `notes` text from `Runbook: /Volumes/Crucial-4T/repo/vps/*.md` to `Runbook: /Volumes/Crucial-4T/repo/allonfire/docs/guides/vps*.md`, then run `chezmoi add ~/.config/hetzner/hetzner.json`.
  - Check that `chezmoi diff` is empty for both.
- [x] **Step 5:** `/Users/isaia/.claude/skills/iso-plan/scripts/plan.sh gate` prints `setup-done`.


Done 2026-11-02: guide rows and gate pass; chezmoi copies match. Repo-qualified references all resolve; every bare name was reviewed in context (server paths, files inside an App, history lines, optional files): none broken.

### Task 12: Final checks and report

- [x] **Step 1:** `find . -name '._*' -not -path './node_modules/*' -delete; pnpm exec biome check --write vps packages/config/local/tests`
- [x] **Step 2:** `pnpm check-types && pnpm lint && pnpm test`. Expected: all pass. Fix anything red.
- [x] **Step 3:** Report to the owner in chat. Never put this in a file. The report covers:
  - Task 4's `## For the owner only` items
  - the dead `n8n.isaiariva.com` DNS record, to remove in Cloudflare
  - n8n's stale `N8N_WEBHOOK_BASE_URL=http://social:3000`
  - Beszel alerts reaching no one, since no workflow exists
  - the restore drill result (13/13 OK, 2026-11-02)
  - the age private key passed through the chat: offer a new key pair
  - every memory file moved or deleted
  - Task 10b's candidates (for the owner to accept or reject) and violations (`path:line`, to fix in a later plan)
  - the old `/opt/backups/pre-knowledge-base-<date>/` folder, for the owner to delete when happy
  - `~/.Trash/vps-20261102`, for the owner to empty

## Implementation Log
- Implemented: 2026-11-02T18:08:15Z
- Workspace: current-branch — feat/instant-users-navigation
- Committed: no — awaiting user review
