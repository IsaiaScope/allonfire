# Knowledge base: VPS guides and the full audit

## Intent

The repo becomes the one place that holds everything needed to work on
AllOnFire and on the VPS it runs on, including the parts of the VPS that are not
AllOnFire (n8n, Hermes, MonorepoOnFire, utility apps, monitoring). Today that
knowledge is split across a loose `vps/` folder (now copied into
`docs/guides/vps/`), package READMEs, superpowers specs and plans, Claude's
memory outside the repo, and the owner's head.

Guides are read by agents on almost every task, so they must cost few tokens:
each one holds only the knowledge that exists nowhere else, and for everything
that already lives somewhere (README, ADR, spec, compose file, script) it gives
a one-line pointer to the source instead of a copy. An agent reads the short
guide and opens the source only when it needs to.

The repo is **public**: no real secret, internal ID or attack-helping detail
lands in a tracked file.

## Goals

- Every VPS document becomes a flat guide beside the others in `docs/guides/`,
  renamed by topic; the `docs/guides/vps/` folder disappears.
- Each guide describes the **current** state first, verified against the live
  server, then keeps past knowledge as a terse dated "History and gotchas"
  section for future bug hunting.
- Sensitive data in every tracked file becomes a placeholder; one table says
  where each real value lives.
- A full audit of the repo's knowledge sources turns into pointer lines in the
  guides, so nothing useful is reachable only by luck.
- `AGENTS.md` lists every guide.

## Non-goals

- No secret rotation in this work (owner's decision, 2026-11-02).
- No git history rewrite: values already committed stay in history.
- No change to any skill (the `ai` repo). The only VPS change is the backup
  phase below.
- Work happens on the current branch, `feat/instant-users-navigation`
  (owner's decision).
- No copying of README, ADR or spec content into guides.

## Anti-goals (failure even if it "works")

- Guides that grow into long prose an agent pays for on every task.
- A real IP, bucket name, email, token, webhook path or internal ID in a
  tracked file after this work.
- A pointer that names a path that does not exist.

## Decisions

### Folder layout

- `docs/agents/` keeps only the three files owned by the owner's skills, which
  read them by path: `domain.md`, `issue-tracker.md`, `triage-labels.md`.
- `docs/guides/` holds every other guide, flat. No sub-folders.
- The rename `docs/agents` to `docs/guides` (already in the working tree,
  unstaged) stands for every other guide; references in `AGENTS.md`,
  `apps/api/README.md`, `packages/auth/README.md` and
  `apps/back-office/src/environment/tests/environment.test.ts` already point at
  `docs/guides/`. Old superpowers plans and specs keep their `docs/agents/`
  mentions (history).

### VPS guides (split agreed with the owner)

| Guide | Holds | From |
|---|---|---|
| `vps.md` | server, access (`ssh main-vps`), Dokploy, the inventory of every service (AllOnFire and others), Cloudflare in front, monitoring (Beszel, UptimeRobot), the placeholder map | `README.md`, `process.md`, `04-server-setup.md`, `06-dns-cutover.md`, `05-data-migration.md` |
| `vps-security.md` | firewall, SSH, CrowdSec, Traefik auth, Dokploy 2FA, unattended upgrades | `07-security.md`, `process.md` |
| `vps-backups.md` | backup design, schedule, restore drill, disaster recovery runbook; pointers to the scripts | `08-disaster-recovery.md`, `process.md` |
| `vps-workflow.md` | n8n (the Workflow service): setup, its webhooks (by placeholder), Telegram notifications | `process.md`, `07-security.md`, `08-disaster-recovery.md` |
| `vps-agent.md` | Hermes agent (container `sofia`): current state, trust boundary | `10-hermes-agent.md` |
| `vps-other-apps.md` | MonorepoOnFire, utility apps, any other hosted service the inventory finds | `01`, `02`, `03`, `09` |
| `deployment.md` (existing) | stays AllOnFire's delivery guide; real values become placeholders; points to `vps*.md` | |

### Guide shape

```
# <Topic>

One line: what this guide covers. Pointers: <source> (<what it holds>), ...

## <current-state sections, dense dot lists>

## History and gotchas
- YYYY-MM-DD: <symptom>; <cause>; <fix>.
```

History lines are one each. A past decision still worth knowing ("Basic auth on
Beszel loops with its own login") is a gotcha line, not a section.

### Scripts

All VPS documentation stays in `docs/guides/vps*.md`. The root `vps/` folder
holds only what runs on the server, with no README or Markdown; `vps.md`,
`vps-backups.md` and `vps-workflow.md` say the scripts are there and how to use
them.


`backup.sh`, `hetzner-snapshot.sh`, `restore-test.sh` and `.env.example` move
to a root `vps/` folder, tracked (not a package: nothing imports them; their tests sit in `packages/config/local/tests/` beside the other repo-wide file checks); they become the source of truth for
`/opt/backups/scripts/`. They hold no secret (values sit in the server's
`/opt/backups/.env`). Checked 2026-11-02: the repo copies are byte-identical to
the server's. `cron-fallback.sh` is deleted: nothing schedules it (cron in
`/etc/cron.d/backup-schedule` runs `backup.sh` daily at 02:00 server time and
`hetzner-snapshot.sh` Sundays at 03:00; n8n no longer triggers backups).
The old `env.template` becomes `vps/.env.example`, the repo's name for an env
template (owner's decision); `local/tests/env-examples.test.ts` lists its files
explicitly, so it is unaffected.

### Backup fixes (first phase, changes the VPS)

Live findings on 2026-11-02 that this phase fixes:

1. AllOnFire storage is not backed up: `backup.sh` looks for a container named
   `minio`; after the purpose-name rename it is `…-storage-1` (volume
   `allonfire-storage-data`). The weekly mirror failed on 2026-11-01; the last
   good one is 2026-10-25. Fix: find the container by its purpose name. Keep the
   mirror's behavior (raw `aws s3 sync`, unencrypted in a private bucket, keeps
   deleted files) and write both facts in `vps-backups.md`. The mirror copies
   the whole volume, telemetry bucket included (builder's call to exclude it).
2. Backup notices fail since 2026-10-31: the webhook URL's host
   `n8n.isaiariva.com` no longer answers; n8n answers on `workflow.isaiariva.com`.
   Fix: the URL host in the server `.env`.
3. Hermes is not backed up: add a component for the `ai-agent-sofia-state`
   volume and `/home/main-user/ai-agent/`, age-encrypted like the others.
4. Env names: every key in `/opt/backups/.env` and `.env.example` gets the
   `BACKUP_` prefix (`BACKUP_S3_BUCKET`, `BACKUP_HCLOUD_TOKEN`,
   `BACKUP_WEBHOOK_URL`, …); the scripts read the new names. Values move inside
   the file on the server (`sed` on key names), never printed.

Rollout: copy the old scripts and `.env` aside on the server (dated), install
the repo scripts with `scp`, rename the keys, run `backup.sh --dry-run`, then
`--test-notify` (the Telegram notice must arrive), then one real run whose
manifest shows every component `ok` including storage and Hermes. Then a
**guided restore drill**: the plan stops, the owner places the age private key
on the server, `restore-test.sh` runs, the key is shredded; the date goes in
`vps-backups.md` History. `vps-backups.md` gives the one `scp` command that
installs the scripts after a future change.

### Placeholders

Real values become placeholders in **every tracked file**, superpowers specs and
plans included (a pure text swap). Public hostnames under `isaiariva.com` stay:
DNS exposes them anyway.

| Placeholder | Real value lives in |
|---|---|
| `<vps-ip>`, `<ssh-port>`, `<ssh-user>` | `~/.ssh/config.d/hetzner` (host `main-vps`); `~/.config/hetzner/hetzner.json` (chezmoi) |
| `<hcloud-token>`, `<hetzner-server-id>` | `~/.config/hcloud/cli.toml` (chezmoi, encrypted); server `/opt/backups/.env` |
| `<dokploy-api-key>` | `~/.config/dokploy-api.conf` (chezmoi, encrypted) |
| `<backup-bucket>`, `<backup-iam-user>`, AWS keys | server `/opt/backups/.env`, `~/.aws/credentials` |
| `<age-public-key>` / age private key | server `/opt/backups/.env` / password manager |
| `<n8n-webhook-path>`, `<backup-webhook-token>` | n8n workflow; server `/opt/backups/.env` |
| `<owner-email>` | password manager |
| `<task-id>`, `<dokploy-org-id>`, `<dokploy-user-id>` | read live from Docker / Dokploy |

The table lives in `vps.md`. Builder's call: exact placeholder names beyond
these, as long as each one appears in the table.

**Chezmoi (allowed by the owner):** `~/.ssh/config.d/hetzner` is not in
chezmoi; add it with `chezmoi add` (private file). The `notes` of the `main`
server in `~/.config/hetzner/hetzner.json` point at the deleted
`/Volumes/Crucial-4T/repo/vps/*.md`; change them to `docs/guides/vps*.md` in
this repo and `chezmoi add` the file again. `~/.config/hetzner/hetzner.json`
(already in chezmoi) is the current roster the hetzner skills read;
`fleet.json` and `software.json` are left alone. No other chezmoi change.

### Live inventory (read-only)

`main-user` has passwordless sudo, so the agent runs the inventory itself. A
first pass ran on 2026-11-02 during design (containers, cron, backups, scripts
diff); the inventory task completes the rest (firewall, CrowdSec, sshd, Traefik
routes, Dokploy projects, DNS records in Cloudflare). Over
`ssh main-vps` (the `hetzner-ssh` skill), read-only commands only:
containers, Swarm services, Dokploy projects, Traefik dynamic files (list and
read routes; never copy a password hash), crontab and timers, firewall and
CrowdSec status, `sshd -T`, disk and memory, `ls /opt/backups` and a diff of its
scripts against the repo copies. Never `cat` an env file or print a value;
key names only. The results feed the current-state sections; nothing from the
inventory is saved raw.

### Full audit (pointer style)

Sources: `apps/*/README.md`, `packages/*/README.md`, `docs/superpowers/specs`
and `plans` (85 files), compose files, `.github/workflows/`, `turbo.json`,
package `scripts`, and Claude's project and reference memories.

- Knowledge that lives in a source: a pointer line in the guide that owns the
  topic ("Image server env: `packages/storage/README.md`").
- Knowledge that lives only in a superpowers file or memory and is still true:
  written once, tightly, in the owning guide.
- A gap with no owning guide: builder's call to add a guide, only if more than a
  handful of lines; otherwise it joins the closest guide.
- Claude memory: still-true project and reference memories move into guides,
  then are deleted from `~/.claude/projects/.../memory/` and their lines removed
  from `MEMORY.md`. Feedback memories follow the conventions section; user
  memories stay.

### Conventions extrapolated from what is built

The guides also hold AllOnFire's conventions for code, folders, names and
writing, extrapolated from what exists so far (owner's request, 2026-11-02).

- Sources: code patterns in `apps/` and `packages/`; the owner's feedback
  memories that are repo rules; lint and format config (`biome.jsonc`,
  `.oxlintrc.json`, `packages/config/typescript/*.json`), as pointers only,
  since a guide never restates what the linter enforces; repo skills in
  `.claude/skills/` (`aof-design`, `aof-documentation`, …), as pointers for
  rules that reach beyond the skill.
- Threshold: a code-only pattern becomes a convention when it repeats in at
  least 3 places with no counterexample. A weaker pattern goes on a candidate
  list for the owner at the end. A rule that already has an authority (a
  feedback memory, lint, a skill, an existing guide) is written as is, and code
  that breaks it is a **violation**.
- Violations are listed in the final report with `path:line` and are not fixed
  in this plan.
- Each convention is one line: the rule, then `Example: <path>`.
- They land in the guide that owns the topic. Builder's call: two new guides
  where nothing owns the topic, `code-style.md` (TypeScript, React, CSS) and
  `writing.md` (comments, docs, user copy).
- Feedback memories that are repo rules move into guides and leave memory:
  animations, ascii_diagrams, avoid_casts, biome_ignore, classes_cva_or_cn,
  crypto_http, dev_db_access, env_naming, flex_height_layout,
  folder_organization, free_libraries_only, generic_comments,
  generic_type_safety, image_dimensions, infer_component_props,
  no_hardcoded_paths, no_permission_may, package_min_downloads, pr_format,
  purpose_names_everywhere, readme_style, responsive, safari_css,
  screenshots_folder, ssr_first, translations_not_messages,
  check_contrast_myself, biome_format_not_check_write. The ones about how the
  agent works with the owner stay in memory: ask_instead_of_stopping,
  browser_testing, commit_everything, commit_on_current_branch, design_budget,
  dev_server_ownership, implement_directly, iso_plan_ask_questions,
  iso_plan_no_stops, iso_review_fix_findings, iso_write_alongside,
  no_auto_commits, no_branch_switching, no_delete_branch, one_step_pacing,
  rules_into_skills, walkthrough_user_drives.

### AGENTS.md

The guides table lists every file in `docs/guides/` and the three in
`docs/agents/`, one row each, with the "when you work on" column. It stays a
table of pointers; no guide content moves into it.

### Workflows that send the messages

The Telegram messages come from n8n, so they are versioned with the scripts.
Live on 2026-11-02, n8n holds two active VPS workflows, **Main VPS Backup
Notification** (webhook `/backup-notify` with header auth, success and failure
branches, Telegram) and **Main VPS Bot Error Workflow** (an error trigger that
sends a Telegram crash alert), plus three inactive ones (Social-era Topic
Discovery, AllOnFire Notifications, a scratch workflow) that stay in n8n and get
a History line. n8n stores its data in Dokploy's Postgres, so `postgres-all`
already backs it up.

- The two active workflows live in `vps/workflows/` as
  `backup-notification.json` and `error-alert.json`, with placeholders for
  the Telegram chat ID, the webhook path, webhook IDs and credential IDs.
  Credential names stay, since import finds IDs by name; secrets never leave
  n8n.
- `vps/workflows.sh export` pulls them from n8n over
  `ssh main-vps`, swaps in the placeholders and drops volatile fields.
  `workflows.sh import <file>` fills the placeholders back from the server
  (`BACKUP_TELEGRAM_CHAT_ID` in `/opt/backups/.env`, the path of
  `BACKUP_WEBHOOK_URL`, credential IDs by name) and imports into n8n.
- Tests: the committed JSON carries only placeholders where real values were,
  and every manifest field the backup workflow reads (`$json.body.<field>`) is
  one `backup.sh` writes. Rollout check: export, import, export again gives an
  identical file.
- Not built: a Beszel alerts workflow (none exists, so Beszel alerts reach
  nobody). Reported to the owner.

### Reported, not fixed

The `n8n.isaiariva.com` DNS record is dead; removing it is a Cloudflare change
left to the owner. n8n's `N8N_WEBHOOK_BASE_URL` still points at the Social-era
`http://social:3000`. Beszel alerts have no workflow. All three go in the final
report.

### Open security items

Owner-only security items the inventory finds are **omitted from every
tracked file** (owner's decision), and no guide hints at an open weakness. They are
reported to the owner in chat at the end of the work instead.

### Unbuilt plans

Items from the old checklists and PRDs that the inventory shows were never
built become one "never built" line each in the owning guide's History. The
original loose `vps/` folder stays in `~/.Trash/vps-20261102` until the owner
empties it, as the full archive.

## Verification

- `git grep` over tracked files finds none of: the server IP, the bucket names,
  the IAM user, the owner's email, the Dokploy IDs, the beszel webhook path,
  or any owner-only security item.
- Every backticked repo path in `docs/guides/*.md` and `AGENTS.md` exists.
- Every file in `docs/guides/` and `docs/agents/` has a row in `AGENTS.md`.
- `docs/guides/vps/` no longer exists.
- `scripts/plan.sh gate` from iso-plan answers `setup-done`.
- A real backup manifest shows every component `ok`, storage and Hermes
  included; the Telegram notice arrives; the restore drill passes.
- `CONTEXT.md` defines VPS and narrows Production (done during design).
- Repo-wide check-types, lint and test pass (one test file's comment changed).

## Left to the builder

Placeholder names beyond the table, the order of sections inside a guide, which
superpowers files are worth a pointer, and whether a gap earns its own guide.
