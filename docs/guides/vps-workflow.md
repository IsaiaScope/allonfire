# VPS Workflow service

The Workflow service runs n8n. Where it runs, the workflows that send the VPS's Telegram messages and call the API, how they are versioned in `vps/workflows/`, and n8n's gotchas. The manifest they read: `vps-backups.md`.

## Where it runs

- Dokploy application, Swarm service `applications-n8n-…`, n8n 2.26, port 5678, host `workflow.isaiariva.com` (Dokploy domain plus `N8N_HOST` and `WEBHOOK_URL` in its env; Traefik file `applications-n8n-….yml`).
- Login: n8n's own (email, password). `/webhook/…` paths are public; each webhook checks its own auth.
- Data: the `n8n` database in Dokploy's Postgres, backed up by `postgres-all`; volume `n8n-data` (`/home/node/.n8n`: binary data, community nodes, config), backed up by `n8n-data`.
- Restart: `docker service update --force applications-n8n-…`, never `docker restart` on the task container (Swarm starts a replacement and the old one comes back orphaned: two n8n against one database).
- Upgrade: change the pinned image tag in Dokploy, Deploy; stay at 2.5.2 or later (CVE-2026-21858 and CVE-2026-25049, both RCE, fixed there).
- Workflow timezone `Europe/Rome`: `$now` prints local time.

## Active workflows

The workflows that message Telegram send through the bot credential `Bot - Main VPS Alerts` to the chat `<telegram-chat-id>`, parse mode HTML (format: below).

- Main VPS Backup Notification (`vps/workflows/backup-notification.json`):
  - Trigger: `POST /webhook/<backup-webhook-path>` (node `POST /backup-notify 🔒`), header auth credential `X-Backup-Token`; anonymous calls get 403.
  - Branch `status === 'success'?`: true to Telegram Success, false (`partial_failure`, `total_failure`, `test`) to Telegram Failure; then Respond OK `{"received":true,"status":"notified"}`.
  - Success shows: date and tier, component count, total MB, storage mirror line (`🖼 Storage N MB · today` or `Nd ago`, a warning past 8 days or never synced), and an expandable list of components with sizes.
  - Failure shows: date and tier, `ok/total` (counting `ok` and `daily_skip` as healthy), the `errors[]`, and each failed component with its status.
  - Settings: error workflow is the one below.
- Main VPS AllOnFire API Services Keep-alive (`vps/workflows/services-keep-alive.json`, ID `AofKeepAlive2611`, chosen in the repo, so the first import creates it):
  - Trigger: Schedule, daily at 03:00 (workflow timezone `Europe/Rome`).
  - `POST <keep-alive-url>` (filled on import from `BACKUP_KEEP_ALIVE_URL` in `/opt/backups/.env`) with the Header Auth credential `Keep-alive Token` (`Authorization: Bearer <API_KEEP_ALIVE_TOKEN>`), which the owner creates in n8n.
  - A Telegram message when any provider answers `rejected` or `uncertain`: `🚨 Keep-alive failed`, the time, `📊 n/m ok`, then the failing providers in a quote as `MAIL · name (slot n) → result` (Admin-typed provider names are escaped); a failed call fails the HTTP node and the error workflow reports it.
  - Why daily: the API sends only through a provider idle for 30 days, so a daily check costs nothing and retries a failure long before a provider's 90 idle days deactivate a key.
- AllOnFire — Notifications (`vps/workflows/notifications.json`, ID `100`, inactive): Error Trigger, a code node that formats the message, a Telegram alert. Kept for reference.
- AllOnFire — Topic Discovery (`vps/workflows/topic-discovery.json`, ID `101`, inactive): the Social product's daily 3 PM (Romania) run. Reads public feeds (Hacker News, Dev.to, RSS, Reddit, GitHub trending), merges and de-duplicates, posts to the Social app's `/api/classify-topics`, `/api/rerank-and-prune` and `/api/webhooks/topics` (`$env.N8N_WEBHOOK_BASE_URL`, `Bearer $env.N8N_API_KEY`), then a Telegram success or failure. Needs those two n8n env vars to run.
- Main VPS Bot Error Workflow (`vps/workflows/error-alert.json`):
  - Trigger: Error Trigger, fired when a workflow that names it as its error workflow hard-fails (API rejection, credential error).
  - Message: time, workflow name, last node, mode, the escaped error message (expandable), a link to the execution.
  - Subscribers: Backup Notification and Services Keep-alive. Active is not enough: a workflow must name it in Settings, Error Workflow.

## Versioning (`vps/workflows.sh`)

- Runs on the Mac over `ssh main-vps`; no value reaches the Mac or the repo.
- `bash vps/workflows.sh export [name…]`: after editing a workflow in n8n's UI. Pulls every workflow, or the names given (the Services keep-alive exists on the VPS only after its first import, so name the others until then), into `vps/workflows/`, swaps in placeholders, drops volatile fields (`versionId`, timestamps, tags, …). Then `find vps -name '._*' -delete` and review the diff.
- `bash vps/workflows.sh import vps/workflows/<file>.json`: to restore a workflow or push a change made in the repo. Fills the placeholders on the server, imports, and publishes again when the file says `active: true` (import alone leaves it inactive). Then restarts n8n through Swarm (`docker service update --force`): the CLI only writes the database, and a running n8n registers an active workflow's webhooks at start, so without the restart they answer 404 while the workflow reads `active`.
- Placeholders in the exports: `<telegram-chat-id>` (from `BACKUP_TELEGRAM_CHAT_ID`), `<backup-webhook-path>` (the path of `BACKUP_WEBHOOK_URL`), `<webhook-id>` (kept from the live workflow, so its URL does not move), `<credential-id>` (looked up by credential name, so names stay in the file). Secrets never leave n8n.
- Workflow IDs are fixed in `workflows.sh`; a new workflow needs a line there.
- Contract: `packages/config/local/tests/workflows.test.ts` fails when an export holds a real ID or volatile field, or when the backup message reads a `$json.body.<field>` that `backup.sh` does not write. A field change goes in `backup.sh` and the workflow together.

## Local loop (`vps/workflows.sh --local`)

The repo's `vps/workflows/*.json` are the source of truth; Local's n8n (`allonfire-workflow`, `http://127.0.0.1:5678`, the version Production pins) runs the same files so a change is tried before it reaches the VPS.

- `bash vps/workflows.sh --local import vps/workflows/<file>.json`: loads one into Local, no ssh. Reads its values from `vps/.env` under the same keys the VPS reads from `/opt/backups/.env`, so the script has no Local special case but where n8n runs and how it restarts. Writes every credential the workflow names from `vps/.env` (so a rotated token lands on the next import); one with no value there is created empty and its secret typed in n8n. Refuses, naming the key, when a placeholder the file holds has an empty value (the keep-alive's URL would otherwise fail at 03:00, not at import). Then restarts Local's n8n through compose (`docker compose -p allonfire ... restart workflow`) so an active workflow's webhooks register.
- `vps/.env` is Local's own file, git-ignored and never committed: the repo is public, so no secret lives in it. Template: `vps/.env.example` (Production's `/opt/backups/.env`, mirrored in `.env.production`, has the same keys). Local's values: `BACKUP_KEEP_ALIVE_URL` (`http://host.docker.internal:3300/v1/services/keep-alive`, the API on the host), `BACKUP_TELEGRAM_CHAT_ID` (the chat every alert goes to), `BACKUP_WEBHOOK_URL` (`http://127.0.0.1:5678/webhook/backup-local`), `BACKUP_WEBHOOK_TOKEN` (credential `X-Backup-Token`, the header `backup.sh` sends), `BACKUP_WORKFLOW_CONTAINER_PATTERN` (`allonfire-workflow`), and the Local-only credential secrets `BACKUP_TELEGRAM_BOT_TOKEN` (`Bot - Main VPS Alerts`) and `BACKUP_TELEGRAM_ALLONFIRE_BOT_TOKEN` (`allonfire_bot`). Fill it from the VPS: the webhook token is in `/opt/backups/.env`; the bot tokens are the VPS n8n's credentials (BotFather holds the originals). The `Keep-alive Token` credential takes `API_KEEP_ALIVE_TOKEN` from `apps/api/.env`, so the API and n8n cannot drift apart.
- `bash vps/workflows.sh --local export [name…]`: pulls from Local into `vps/workflows/` with the same redaction as the VPS export, so a clean round trip leaves no diff. It keeps each file's committed `active` flag.
- A schedule never goes active Locally (it would send real mail and alerts at 03:00 whenever the Mac and the API are up); run it from the editor with Execute workflow. Webhook workflows are active: `curl -X POST http://127.0.0.1:5678/webhook/backup-local -H 'X-Backup-Token: <the credential value>' -d @manifest.json`.
- The loop: edit in Local's editor or in the JSON, `--local export` or `--local import`, run it, review the diff, then `bash vps/workflows.sh import <file>` for the VPS.
- Keep-alive needs the API running on port 3300.

## Telegram message format

Every message the workflows send follows one shape, so an alert reads the same whichever workflow raised it:

- Title: a status emoji and a bold title, `<b>Backup failed</b>`. `✅` ok, `🚨` a failure of the thing the workflow watches (backup, keep-alive), `🔥` the workflow itself crashed, `⚠️` a warning inside an otherwise healthy message.
- Date line: `📅 <code>…</code> · context` (the backup's date and tier; the keep-alive has only the time), then a blank line.
- Facts: one per line, each led by its own emoji (`📦` components, `💾` size, `📊` `n/m ok`, `📋` workflow, `💥` last node, `⚙️` mode). Short, no sentences.
- Sections: a bold heading with an emoji (`❌ <b>Errors</b>`, `📦 <b>Failed</b>`), then a `<blockquote>`, one item per line as `name → status`; `<blockquote expandable>` when the list can be long.
- Link last, `🔗 <a href="…">Open execution</a>`, only when there is a page to open.
- Telegram node: Additional Fields `parse_mode` HTML and `appendAttribution` off, or the tags print literally and n8n adds its signature.
- Everything dynamic is guarded (`?.`, `??`) and anything typed by a person or an error message is escaped, `&` first, then `<` and `>`. The workflows test fails a message that is not HTML with attribution off.

## Working in n8n

- Save is not Publish: the editor saves a draft; the runtime serves the newest `workflow_history` row, written by Publish. Re-pasting identical text makes no version, so Save seems to do nothing: make a real edit, Save, Publish.
- Never edit n8n's tables directly: a write to `workflow_entity.nodes` reads back fine and changes nothing at runtime; an invented `versionId` breaks publishing ("Version not found").
- An expression error renders as an empty string and the run still records `success`; the error workflow never sees it. Every template guards its fields with `?.` and `??`.
- Parse mode lives under Telegram, Additional Fields; without it the HTML tags print literally.
- In HTML mode escape `&` first, then `<` and `>`; an unescaped `<` makes Telegram answer 400 and the message is lost. The crash alert escapes `error.message`.
- Filter failed components with `!['ok','daily_skip'].includes(c.status)`, never `!== 'ok'`: `daily_skip` is the mirror's normal weekday state.
- Silent webhook: a backup night with no Telegram message. `grep 'n8n notification' /opt/backups/logs/backup.log`; POST the webhook URL with no token: `403` is healthy, `404` means the webhook is not registered, restart the service.
- Test the backup message: `ssh main-vps 'sudo /opt/backups/scripts/backup.sh --test-notify'` (failure branch). Test the crash alert: set a subscriber's chat ID to `1`, Publish, trigger it, Telegram 400s and the alert fires; revert the chat ID.

## History and gotchas

- 2026-03: deployed as a Dokploy application with SQLite in its volume; IP allowlist on the editor dropped (dynamic home IP), n8n's login only.
- 2026-03-04: backup notice read `manifest.json` from a read-only bind mount at 02:30; replaced by the webhook POST from `backup.sh` (`vps-backups.md`).
- 2026-08-05: n8n's data had moved from SQLite to Dokploy's Postgres; `n8n-data` leaves out the stale SQLite files.
- 2026-08-05: a payload with no `components` rendered `Backup OK · / componenti · NaN MB` with no error anywhere; expression errors are silent; templates guard every field.
- 2026-10: host renamed `n8n.` to `workflow.`; `BACKUP_WEBHOOK_URL` followed on 2026-11-02 (`vps-backups.md`).
- 2026-11-02: workflows exported to `vps/workflows/`; the mirror line reads `storage` instead of `minio`.
- 2026-11-02: inactive Social-era workflows left in n8n: AllOnFire Topic Discovery, AllOnFire Notifications, a scratch "My workflow".
- 2026-11-02 to 2026-11-09: the backup notice never reached Telegram. The import that day left the webhook unregistered (`404 … is not registered`, empty `webhook_entity`); `backup.sh` only logged `n8n notification failed (non-critical)`. Fixed by restarting the service; `workflows.sh import` now does it.
- 2026-03-04: never built: a Beszel alerts workflow (Beszel's notifications to a webhook `<beszel-webhook-path>`).
