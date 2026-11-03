# VPS Workflow service

The Workflow service runs n8n. Where it runs, the two workflows that send the VPS's Telegram messages, how they are versioned in `vps/workflows/`, and n8n's gotchas. The manifest they read: `vps-backups.md`.

## Where it runs

- Dokploy application, Swarm service `applications-n8n-…`, n8n 2.26, port 5678, host `workflow.isaiariva.com` (Dokploy domain plus `N8N_HOST` and `WEBHOOK_URL` in its env; Traefik file `applications-n8n-….yml`).
- Login: n8n's own (email, password). `/webhook/…` paths are public; each webhook checks its own auth.
- Data: the `n8n` database in Dokploy's Postgres, backed up by `postgres-all`; volume `n8n-data` (`/home/node/.n8n`: binary data, community nodes, config), backed up by `n8n-data`.
- Restart: `docker service update --force applications-n8n-…`, never `docker restart` on the task container (Swarm starts a replacement and the old one comes back orphaned: two n8n against one database).
- Upgrade: change the pinned image tag in Dokploy, Deploy; stay at 2.5.2 or later (CVE-2026-21858 and CVE-2026-25049, both RCE, fixed there).
- Workflow timezone `Europe/Rome`: `$now` prints local time.

## Active workflows

Both send through the Telegram bot credential `Bot - Main VPS Alerts` to the chat `<telegram-chat-id>`, parse mode HTML.

- Main VPS Backup Notification (`vps/workflows/backup-notification.json`):
  - Trigger: `POST /webhook/<backup-webhook-path>` (node `POST /backup-notify 🔒`), header auth credential `X-Backup-Token`; anonymous calls get 403.
  - Branch `status === 'success'?`: true to Telegram Success, false (`partial_failure`, `total_failure`, `test`) to Telegram Failure; then Respond OK `{"received":true,"status":"notified"}`.
  - Success shows: date and tier, component count, total MB, storage mirror line (`🖼 Storage N MB · today` or `Nd ago`, a warning past 8 days or never synced), and an expandable list of components with sizes.
  - Failure shows: date and tier, `ok/total` (counting `ok` and `daily_skip` as healthy), the `errors[]`, and each failed component with its status.
  - Settings: error workflow is the one below.
- Main VPS Bot Error Workflow (`vps/workflows/error-alert.json`):
  - Trigger: Error Trigger, fired when a workflow that names it as its error workflow hard-fails (API rejection, credential error).
  - Message: time, workflow name, last node, mode, the escaped error message (expandable), a link to the execution.
  - Subscribers: Backup Notification only. Active is not enough: a workflow must name it in Settings, Error Workflow.

## Versioning (`vps/workflows.sh`)

- Runs on the Mac over `ssh main-vps`; no value reaches the Mac or the repo.
- `bash vps/workflows.sh export`: after editing a workflow in n8n's UI. Pulls both into `vps/workflows/`, swaps in placeholders, drops volatile fields (`versionId`, timestamps, tags, …). Then `find vps -name '._*' -delete` and review the diff.
- `bash vps/workflows.sh import vps/workflows/<file>.json`: to restore a workflow or push a change made in the repo. Fills the placeholders on the server, imports, and publishes again when the file says `active: true` (import alone leaves it inactive). The running n8n keeps serving the webhook; no restart.
- Placeholders in the exports: `<telegram-chat-id>` (from `BACKUP_TELEGRAM_CHAT_ID`), `<backup-webhook-path>` (the path of `BACKUP_WEBHOOK_URL`), `<webhook-id>` (kept from the live workflow, so its URL does not move), `<credential-id>` (looked up by credential name, so names stay in the file). Secrets never leave n8n.
- Workflow IDs are fixed in `workflows.sh`; a new workflow needs a line there.
- Contract: `packages/config/local/tests/workflows.test.ts` fails when an export holds a real ID or volatile field, or when the backup message reads a `$json.body.<field>` that `backup.sh` does not write. A field change goes in `backup.sh` and the workflow together.

## Working in n8n

- Save is not Publish: the editor saves a draft; the runtime serves the newest `workflow_history` row, written by Publish. Re-pasting identical text makes no version, so Save seems to do nothing: make a real edit, Save, Publish.
- Never edit n8n's tables directly: a write to `workflow_entity.nodes` reads back fine and changes nothing at runtime; an invented `versionId` breaks publishing ("Version not found").
- An expression error renders as an empty string and the run still records `success`; the error workflow never sees it. Every template guards its fields with `?.` and `??`.
- Parse mode lives under Telegram, Additional Fields; without it the HTML tags print literally.
- In HTML mode escape `&` first, then `<` and `>`; an unescaped `<` makes Telegram answer 400 and the message is lost. The crash alert escapes `error.message`.
- Filter failed components with `!['ok','daily_skip'].includes(c.status)`, never `!== 'ok'`: `daily_skip` is the mirror's normal weekday state.
- Test the backup message: `ssh main-vps 'sudo /opt/backups/scripts/backup.sh --test-notify'` (failure branch). Test the crash alert: set a subscriber's chat ID to `1`, Publish, trigger it, Telegram 400s and the alert fires; revert the chat ID.

## History and gotchas

- 2026-03: deployed as a Dokploy application with SQLite in its volume; IP allowlist on the editor dropped (dynamic home IP), n8n's login only.
- 2026-03-04: backup notice read `manifest.json` from a read-only bind mount at 02:30; replaced by the webhook POST from `backup.sh` (`vps-backups.md`).
- 2026-08-05: n8n's data had moved from SQLite to Dokploy's Postgres; `n8n-data` leaves out the stale SQLite files.
- 2026-08-05: a payload with no `components` rendered `Backup OK · / componenti · NaN MB` with no error anywhere; expression errors are silent; templates guard every field.
- 2026-10: host renamed `n8n.` to `workflow.`; `BACKUP_WEBHOOK_URL` followed on 2026-11-02 (`vps-backups.md`).
- 2026-11-02: workflows exported to `vps/workflows/`; the mirror line reads `storage` instead of `minio`.
- 2026-11-02: inactive Social-era workflows left in n8n: AllOnFire Topic Discovery, AllOnFire Notifications, a scratch "My workflow".
- 2026-03-04: never built: a Beszel alerts workflow (Beszel's notifications to a webhook `<beszel-webhook-path>`).
