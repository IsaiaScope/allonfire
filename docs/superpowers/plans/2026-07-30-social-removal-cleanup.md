# Social Removal Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every remaining artefact of the deleted social app from the allonfire monorepo and the `main` Hetzner VPS, so no file, image, or document describes a system that no longer exists.

**Status:** implemented @ 2026-07-30T12:15:54Z — committed on `chore/social-cleanup`. Track A done; Track B done; two VPS UI steps and Track C outstanding (see log).

**Architecture:** Three independent tracks. Track A is pure operations — filesystem and Docker deletions, nothing committed. Track B is a single documentation PR on `chore/social-cleanup`. Track C is credential revocation the user performs by hand in third-party consoles. Tracks may run in any order, except that Track A should precede Track B's verification so a stale `apps/social/.env` cannot show up in a grep.

**Tech Stack:** Turborepo, pnpm, Next.js 16, Prisma 7, BetterAuth, Docker Compose, Dokploy, n8n, Traefik, PostgreSQL 16.

**Spec:** `docs/superpowers/specs/2026-07-29-social-removal-cleanup-design.md`

## Global Constraints

- This is a cleanup plan. It has no unit tests. Every task ends in a **runnable verification command** with stated expected output — that is this plan's equivalent of a test, and no task is complete until its verification command produces the expected result.
- Repo lives on an exFAT external drive at `/Volumes/Crucial-4T/repo/allonfire`. macOS writes `._*` resource-fork files there. Filter them out of every listing (`! -name '._*'` or `grep -v '\._'`).
- `ls` is aliased to a tree-style formatter in this shell. Scripted listings must use `find -exec stat` or `command ls`, never bare `ls -t`.
- Git commits may need `git -c core.checkStat=minimal` to avoid phantom dirty files on exFAT.
- The `pre-commit` hook runs `pnpm lint && pnpm check-types && pnpm test`. It must pass. A `graphify` post-commit hook may fail on a missing LLM API key — that is unrelated and does not block the commit.
- VPS access is via `ssh main-vps` (multiplexed; see the `hetzner-ssh` skill). Expected `hostname` is `main`. If it differs, stop.
- Docker container names on the VPS contain rotating Swarm task IDs. Resolve them at call time with `docker ps --format "{{.Names}}" | grep <service>`, never hardcode.
- **Do not delete the `Backup Notification` n8n workflow.** It is active, social-free, and has no repo counterpart, so it exists nowhere but this VPS.
- Never paste VPS secrets into chat or write them to disk. Read env files for key *names* only.
- Out of scope, touch nothing: the `monorepoonfire` Dokploy app, its database, its Traefik config, and `www.isaiariva.com`.

---

## File Structure

**Track A — deleted, not committed:**

| Path | Action |
|---|---|
| `apps/social/` | delete (6.0 GB, build artefacts + `.env`) |
| `packages/social-publisher/` | delete (22 MB) |
| `packages/content-generator/` | delete (25 MB) |
| `packages/video-overlays/` | delete (624 MB) |
| `packages/video-pipeline/` | delete (38 MB) |

**Track B — committed on `chore/social-cleanup`:**

| Path | Action | Responsibility after change |
|---|---|---|
| `docs/screenshots/*.png` (13 files) | Delete | Only Laura screenshots remain |
| `n8n/workflows/publishing.json` | Delete | — |
| `n8n/README.md` | Modify | Documents the parked Topic Discovery workflow honestly |
| `n8n/workflow-explained.md` | Modify | Same, with dead integration points marked |
| `packages/database/README.md` | Rewrite | Documents only the 5 services and 9 models that exist |
| `packages/auth/README.md` | Modify | Example uses `laura` |
| `packages/ui/README.md` | Modify | Example references `apps/laura` |
| `packages/config/README.md` | Modify | Example lists only `apps/laura` |
| `.claude/skills/doc-gen/SKILL.md` | Modify | Screenshot workflow covers Laura only |
| `.claude/skills/doc-gen/references/doc-map.md` | Modify | Inventory lists only live files |
| `.claude/skills/doc-gen/references/doc-standards.md` | Modify | Naming convention keeps the rule, drops the obsolete rationale |
| `CLAUDE.md` | Modify | No dangling `AGENTS.md` pointer |
| `.claude/settings.local.json` | Modify | No stale `apps/social` permission entries |

---

## Track A — Disk reclaim

### Task 1: Delete the local orphan directories

**Files:**
- Delete: `apps/social/`, `packages/social-publisher/`, `packages/content-generator/`, `packages/video-overlays/`, `packages/video-pipeline/`

**Interfaces:**
- Consumes: nothing
- Produces: a workspace with no orphan directories. Task 9's verification depends on this.

- [x] **Step 1: Confirm every target is untracked before deleting anything**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
for d in apps/social packages/social-publisher packages/content-generator packages/video-overlays packages/video-pipeline; do
  printf '%-34s tracked_files=%s\n' "$d" "$(git ls-files "$d" | wc -l | tr -d ' ')"
done
```

Expected: `tracked_files=0` for all five. **If any line shows a non-zero count, stop and report it** — that directory still has tracked content and this plan's premise is wrong for it.

- [x] **Step 2: Confirm no surviving package depends on the packages being deleted**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
grep -rn '@repo/social-publisher\|@repo/content-generator\|@repo/video-overlays\|@repo/video-pipeline\|@allonfire/social-publisher\|@allonfire/content-generator\|@allonfire/video-overlays\|@allonfire/video-pipeline' \
  --include='package.json' --include='*.ts' --include='*.tsx' \
  apps packages 2>/dev/null
echo "exit=$?"
```

Expected: no output, `exit=1`. **If any match appears, stop** — something live still imports a package slated for deletion.

- [x] **Step 3: Record the reclaimed size for the final report**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
du -sh apps/social packages/social-publisher packages/content-generator packages/video-overlays packages/video-pipeline 2>/dev/null
```

Expected: roughly `6.0G`, `22M`, `25M`, `624M`, `38M`. Note the total (~6.7 GB).

- [x] **Step 4: Delete the five directories**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
rm -rf apps/social packages/social-publisher packages/content-generator packages/video-overlays packages/video-pipeline
```

- [x] **Step 5: Verify they are gone and git is unaffected**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
for d in apps/social packages/social-publisher packages/content-generator packages/video-overlays packages/video-pipeline; do
  [ -e "$d" ] && echo "STILL PRESENT: $d" || echo "gone: $d"
done
git status --porcelain | grep -v '\._' ; echo "(git clean above this line)"
```

Expected: five `gone:` lines, and no git output other than the trailing marker.

- [x] **Step 6: Resync the workspace and confirm the build is unharmed**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
pnpm install
pnpm check-types
pnpm test
```

Expected: install succeeds; `check-types` and `test` pass. If `pnpm install` modifies `pnpm-lock.yaml`, leave the change uncommitted — Task 8 commits it with Track B.

Nothing is committed in this task.

---

### Task 2: Reclaim Docker storage on the VPS

**Files:** none — remote operations only.

**Interfaces:**
- Consumes: nothing
- Produces: a VPS with no social image, no dangling images, and an empty build cache. Task 9 verifies this.

- [x] **Step 1: Confirm you are on the right box**

```bash
ssh main-vps 'hostname'
```

Expected: exactly `main`. **Anything else: stop immediately and run nothing further.** Hetzner reuses IPs, so a stale roster can point at a stranger's machine.

- [x] **Step 2: Record the baseline**

```bash
ssh main-vps 'docker system df; echo "--- social images ---"; docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | grep -i social; echo "--- social containers ---"; docker ps -a --format "{{.Names}}" | grep -i social; echo "(none above = good)"'
```

Expected: `applications-allonfire-nrnhaj-social:latest` listed under images, **no** social containers, build cache ~4.5 GB reclaimable.

- [x] **Step 3: Remove the orphan social image**

```bash
ssh main-vps 'docker image rm applications-allonfire-nrnhaj-social:latest'
```

Expected: `Untagged:` / `Deleted:` lines. If it reports the image is in use by a container, **stop** — Step 2 said there was no such container, so something has changed.

- [x] **Step 4: Prune dangling images and build cache**

```bash
ssh main-vps 'docker image prune -f && docker builder prune -f'
```

Expected: reclaimed totals printed, roughly 519 MB then 4.5 GB.

- [x] **Step 5: Verify the reclaim and that Laura is untouched**

```bash
ssh main-vps 'docker system df; echo "--- social images ---"; docker images --format "{{.Repository}}:{{.Tag}}" | grep -i social; echo "(no social image above = good)"; echo "--- laura ---"; docker ps --format "{{.Names}}\t{{.Status}}" | grep laura'
curl -s -o /dev/null -w 'laura.isaiariva.com -> %{http_code}\n' https://laura.isaiariva.com
```

Expected: no social image; `Build Cache` and dangling images at 0 B; the Laura container `Up ... (healthy)`; HTTP `200` (or `3xx` if it redirects to a locale route).

---

### Task 3: Remove the dead VPS workflow and env vars

**Files:** none — remote and Dokploy UI operations.

**Interfaces:**
- Consumes: nothing
- Produces: a VPS n8n instance with three workflows and a compose environment with no `SOCIAL_VIEWER_*` keys.

- [x] **Step 1: Record the current workflow state**

```bash
PG=$(ssh main-vps 'docker ps --format "{{.Names}}" | grep postgres')
ssh main-vps "docker exec $PG psql -U dokploy -d n8n -Atc \"SELECT name, active, json_array_length(nodes) FROM workflow_entity ORDER BY name\""
```

Expected exactly four rows:

```
AllOnFire — Notifications|t|4
AllOnFire — Topic Discovery|f|57
Backup Notification|t|6
My workflow|f|4
```

**If `Backup Notification` is absent, stop** — it is unversioned and its loss would be permanent, so an unexpected state must be understood before any deletion.

- [ ] **Step 2: Delete `My workflow` through the n8n UI**

Open `https://n8n.isaiariva.com`, locate the workflow named exactly `My workflow`, and delete it.

Use the UI rather than SQL: n8n keeps related rows (executions, tags, shared-workflow links) that a bare `DELETE FROM workflow_entity` would orphan.

Delete **only** `My workflow`. Leave the other three alone.

- [ ] **Step 3: Verify three workflows remain, with the right ones active**

```bash
PG=$(ssh main-vps 'docker ps --format "{{.Names}}" | grep postgres')
ssh main-vps "docker exec $PG psql -U dokploy -d n8n -Atc \"SELECT name, active FROM workflow_entity ORDER BY name\""
```

Expected exactly:

```
AllOnFire — Notifications|t
AllOnFire — Topic Discovery|f
Backup Notification|t
```

- [x] **Step 4: Record which env keys exist, by name only**

```bash
ssh main-vps 'grep -oE "^[A-Za-z_][A-Za-z0-9_]*" /etc/dokploy/compose/applications-allonfire-nrnhaj/code/docker/.env | sort'
```

Expected to include `SOCIAL_VIEWER_EMAIL` and `SOCIAL_VIEWER_PASSWORD`, alongside the live `LAURA_VIEWER_EMAIL` / `LAURA_VIEWER_PASSWORD`.

Print key names only. Do not print values.

- [ ] **Step 5: Remove the two dead keys via the Dokploy UI**

In Dokploy (`https://panel.isaiariva.com`), open the `allonfire` compose service's Environment settings and delete `SOCIAL_VIEWER_EMAIL` and `SOCIAL_VIEWER_PASSWORD`. Save, then redeploy the service.

**Do not edit `/etc/dokploy/compose/.../docker/.env` directly.** Dokploy renders that file from its own database and overwrites it on the next deploy, so a direct edit silently reverts.

Keep `LAURA_VIEWER_EMAIL` and `LAURA_VIEWER_PASSWORD` — they are live.

- [ ] **Step 6: Verify the keys are gone and Laura still serves**

```bash
ssh main-vps 'grep -cE "^SOCIAL_VIEWER" /etc/dokploy/compose/applications-allonfire-nrnhaj/code/docker/.env; grep -cE "^LAURA_VIEWER" /etc/dokploy/compose/applications-allonfire-nrnhaj/code/docker/.env'
ssh main-vps 'docker ps --format "{{.Names}}\t{{.Status}}" | grep laura'
curl -s -o /dev/null -w 'laura -> %{http_code}\n' https://laura.isaiariva.com
```

Expected: `0` then `2`; the Laura container healthy; HTTP `200`/`3xx`.

---

## Track B — Documentation PR

### Task 4: Branch, and delete the orphaned assets

**Files:**
- Delete: `docs/screenshots/{admin-providers,admin-users,dashboard,discover,generate,publish-compose,settings,mobile-admin,mobile-dashboard,mobile-discover,mobile-generate,mobile-publish,mobile-settings}.png`
- Delete: `n8n/workflows/publishing.json`

**Interfaces:**
- Consumes: nothing
- Produces: branch `chore/social-cleanup`, from which Tasks 5–8 continue.

- [x] **Step 1: Create the branch**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
git checkout dev && git pull --ff-only
git checkout -b chore/social-cleanup
```

- [x] **Step 2: Prove the 13 screenshots are unreferenced, using anchored matching**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
for f in admin-providers admin-users dashboard discover generate publish-compose settings \
         mobile-admin mobile-dashboard mobile-discover mobile-generate mobile-publish mobile-settings; do
  n=$(grep -rlE "(^|[/\"'(])$f\.png" --include='*.md' . 2>/dev/null \
      | grep -v node_modules | grep -v 'doc-gen/references/doc-map.md' | wc -l | tr -d ' ')
  printf '%-22s refs_outside_docmap=%s\n' "$f.png" "$n"
done
```

Expected: `refs_outside_docmap=0` on all 13.

The `(^|[/"'(])` prefix is essential. A bare substring search for `settings.png` also matches `laura-settings.png` and `mobile-laura-settings.png`, which would wrongly make an orphan look live.

- [x] **Step 3: Prove `publishing.json` is an empty stub and unreferenced**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
grep -c '"type"' n8n/workflows/publishing.json
grep -rln 'publishing.json' --include='*.md' --include='*.json' . 2>/dev/null | grep -v node_modules
echo "(no files above = unreferenced)"
```

Expected: `0` node-type occurrences, and no referencing files.

- [x] **Step 4: Delete them**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
git rm docs/screenshots/admin-providers.png docs/screenshots/admin-users.png \
       docs/screenshots/dashboard.png docs/screenshots/discover.png \
       docs/screenshots/generate.png docs/screenshots/publish-compose.png \
       docs/screenshots/settings.png docs/screenshots/mobile-admin.png \
       docs/screenshots/mobile-dashboard.png docs/screenshots/mobile-discover.png \
       docs/screenshots/mobile-generate.png docs/screenshots/mobile-publish.png \
       docs/screenshots/mobile-settings.png
git rm n8n/workflows/publishing.json
```

- [x] **Step 5: Verify only Laura screenshots remain, and all are live**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
echo "remaining: $(git ls-files docs/screenshots/ | wc -l | tr -d ' ')"
for f in $(git ls-files docs/screenshots/ | xargs -n1 basename); do
  n=$(grep -rlE "(^|[/\"'(])$(printf '%s' "$f" | sed 's/\./\\./g')" --include='*.md' . 2>/dev/null \
      | grep -v node_modules | grep -v 'doc-gen/references/doc-map.md' | wc -l | tr -d ' ')
  [ "$n" -eq 0 ] && echo "ORPHAN: $f"
done
echo "(no ORPHAN lines = good)"
```

Expected: `remaining: 12`, and no `ORPHAN` lines.

- [x] **Step 6: Commit**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
git -c core.checkStat=minimal commit -m "chore(docs): delete orphaned social screenshots and empty publishing workflow"
```

---

### Task 5: Rewrite `packages/database/README.md`

**Files:**
- Modify: `packages/database/README.md` (285 lines)

**Interfaces:**
- Consumes: branch from Task 4
- Produces: a README describing only what exists. Task 9 verifies no dead service or model names remain.

**Why a rewrite and not an edit:** 7 of the 12 API-reference sections document services that no longer exist. `Key Models` lists mostly-deleted models. Editing around that leaves a document whose shape still implies the old system.

- [x] **Step 1: Establish ground truth for services and models**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
echo "=== services that exist ==="; git ls-files packages/database/src/services/
echo "=== models and enums that exist ==="; grep -nE '^(model|enum) ' packages/database/prisma/schema.prisma
echo "=== public exports ==="; cat packages/database/src/services/index.ts
```

Expected services: `favorite.service.ts`, `game-score.service.ts`, `photo.service.ts`, `quiz.service.ts`, `user.service.ts` (plus `index.ts`).

Expected models: `User`, `Session`, `Account`, `Verification`, `Photo`, `Favorite`, `GameScore`, `QuizQuestion`, `QuizAnswer`. Expected enums: `Role`, `GameType`.

- [x] **Step 2: Delete the seven dead API-reference sections**

Remove these headings and their bodies entirely:

| Heading | Line (before edits) |
|---|---|
| `### Topic Service` | 39 |
| `### Prompt Service` | 55 |
| `### Provider Service` | 66 |
| `### Settings Service` | 77 |
| `### Social Account Service` | 83 |
| `### Stats Service` | 92 |
| `### Webhook Log Service` | 109 |

Keep, in this order: `### User Service`, `### Favorite Service`, `### Game Score Service`, `### Photo Service`, `### Quiz Service`.

Line numbers shift as you delete. Work bottom-up (Webhook Log first, Topic last) so earlier numbers stay valid.

- [x] **Step 3: Replace the `## Key Models` table**

Replace the existing table body (which lists `Topic`, `Prompt`, `Post`, `SocialAccount`, `AiProvider`, `Settings`) with:

```markdown
| Model | Purpose | Key Fields |
|---|---|---|
| `User` | Accounts, BetterAuth-managed | `email`, `name`, `role` |
| `Session` | Active sessions, BetterAuth-managed | `userId`, `token`, `expiresAt` |
| `Account` | Credential and OAuth links, BetterAuth-managed | `userId`, `providerId` |
| `Verification` | Email/token verification, BetterAuth-managed | `identifier`, `value`, `expiresAt` |
| `Photo` | Uploaded gallery photos | `url`, `uploadedById`, `createdAt` |
| `Favorite` | Per-user photo favourites | `userId`, `photoId` |
| `GameScore` | Memory and quiz leaderboard entries | `userId`, `gameType`, `score` |
| `QuizQuestion` | Admin-authored quiz questions | `question`, `correctAnswer` |
| `QuizAnswer` | Submitted quiz answers | `questionId`, `userId`, `answer` |
```

- [x] **Step 4: Fix the `## Service Layer` tree and `## Directory Structure`**

In the `## Service Layer` tree, delete the lines for `provider.service`, `settings.service`, `social-account.service`, and `stats.service` (the social-account line is at 24 before edits).

In `## Directory Structure`, delete the matching `provider.service.ts`, `settings.service.ts`, `social-account.service.ts`, and `stats.service.ts` lines (social-account is at 208 before edits).

Both listings must end up naming exactly: `favorite.service`, `game-score.service`, `photo.service`, `quiz.service`, `user.service`.

- [x] **Step 5: Update `### Enums`**

The enums section must list only `Role` and `GameType`. Delete any other enum (for example a `Platform` or `PostStatus` entry) if present.

- [x] **Step 6: Verify no dead name survives**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
grep -nE 'Topic|Prompt|SocialAccount|AiProvider|Webhook|social-account|provider\.service|settings\.service|stats\.service|\bPost\b' packages/database/README.md
echo "exit=$?"
```

Expected: no output, `exit=1`.

- [x] **Step 7: Verify every documented service really exists**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
for s in favorite game-score photo quiz user; do
  [ -f "packages/database/src/services/$s.service.ts" ] && echo "ok: $s" || echo "MISSING: $s"
done
grep -oE '^### [A-Za-z ]+Service' packages/database/README.md
```

Expected: five `ok:` lines, and exactly five `### ... Service` headings matching them.

- [x] **Step 8: Commit**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
git add packages/database/README.md
git -c core.checkStat=minimal commit -m "docs(database): document only the services and models that exist"
```

---

### Task 6: Fix the three package README examples

**Files:**
- Modify: `packages/auth/README.md` (around line 92)
- Modify: `packages/ui/README.md` (around line 49)
- Modify: `packages/config/README.md` (around line 24)

**Interfaces:**
- Consumes: branch from Task 4
- Produces: examples that reference only surviving apps.

These are illustrations of APIs that still exist. Only the example's subject app is stale, so change the subject and nothing else.

- [x] **Step 1: `packages/auth/README.md` — change the app key**

Replace:

```ts
  await checkAppAccess(auth, "social");
```

with:

```ts
  await checkAppAccess(auth, "laura");
```

- [x] **Step 2: `packages/ui/README.md` — change the comment's app**

Replace:

```tsx
// From a feature component in apps/social
```

with:

```tsx
// From a feature component in apps/laura
```

- [x] **Step 3: `packages/config/README.md` — drop the deleted app from the list**

Replace:

```json
// Next.js apps (apps/social, apps/laura)
```

with:

```json
// Next.js apps (apps/laura)
```

- [x] **Step 4: Confirm `checkAppAccess` actually accepts `"laura"`**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
grep -rn 'checkAppAccess' packages/auth/src/guard.ts
grep -rn 'checkAppAccess(' apps/laura/src | head -5
```

Expected: the function exists in `packages/auth/src/guard.ts`, and Laura's own call sites show the argument form the example now uses. **If Laura passes something other than a bare `"laura"` string, match Laura's real call instead** — the example must mirror working code.

- [x] **Step 5: Verify and commit**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
grep -rn 'social' packages/auth/README.md packages/ui/README.md packages/config/README.md
echo "exit=$?"
```

Expected: no output, `exit=1`.

```bash
cd /Volumes/Crucial-4T/repo/allonfire
git add packages/auth/README.md packages/ui/README.md packages/config/README.md
git -c core.checkStat=minimal commit -m "docs(packages): point README examples at laura"
```

---

### Task 7: Mark the n8n docs' dead integration points

**Files:**
- Modify: `n8n/README.md` (138 lines)
- Modify: `n8n/workflow-explained.md` (525 lines)

**Interfaces:**
- Consumes: branch from Task 4
- Produces: n8n docs that describe the parked workflow honestly.

**Scope discipline — read before editing.** Both documents describe the Topic Discovery workflow, which is **kept, not deleted**. `n8n/README.md` is titled "n8n Topic Discovery Workflow"; `workflow-explained.md` documents its seven phases across 525 lines. The vast majority of both files remains accurate. Change only the parts that reference the deleted app.

**Do not touch** the node named `Collect Social Items` (`workflow-explained.md:26`, and its Phase 2 description around line 228). "Social" there means social *media* sources — Hacker News, Reddit, YouTube — not the deleted social *app*. That node still exists in the workflow.

- [x] **Step 1: Add a parked banner to `n8n/README.md`**

Immediately after the `# n8n Topic Discovery Workflow` heading on line 1, insert:

```markdown
> **Status: parked.** This workflow is present but inactive. Phase 4 posts to
> `/api/classify-topics`, an endpoint the deleted social app served and no
> surviving app provides. The workflow is retained because its 57 nodes of
> collection and ranking logic stay valuable if content automation returns.
> Reactivating it requires repointing the classification call first.
```

- [x] **Step 2: Mark the dead references in `n8n/README.md`**

Find each reference and annotate rather than delete, so a future reader can see what the integration used to be:

| Around line | Reference | Change |
|---|---|---|
| 61 | `N8N_WEBHOOK_BASE_URL` pointing at the social app | Append: `(dead — the social app that served this base URL was removed)` |
| 62 | `N8N_API_KEY` described as the social app's auth | Reword: the key remains used by the notification webhook; the social-app auth flow it also served is gone |
| 82 | `/api/classify-topics` | Append: `(no longer served by any app)` |
| 94 | `apps/social/src/lib/api-auth.ts` | Append: `(deleted with the social app)` |
| 98 | `apps/social/src/proxy.ts` | Append: `(deleted with the social app)` |

- [x] **Step 3: Add the same banner to `n8n/workflow-explained.md`**

After the `# Topic Discovery Workflow — How It Works` heading on line 1, insert the identical parked banner from Step 1.

- [x] **Step 4: Annotate `workflow-explained.md`'s three dead spots**

| Around line | Section | Change |
|---|---|---|
| 252 | Phase 4: AI Classification — POST to the social app | Note that this POST targets an endpoint no surviving app serves, and that it is why the workflow is parked |
| 257 | Social app classification logic | Note the logic lived in the deleted app |
| 523 | Troubleshooting referencing `apps/social/.env` | Replace with the n8n container's own environment, since `apps/social/.env` no longer exists |

- [x] **Step 5: Verify only intended `social` references remain**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
grep -niE 'social' n8n/README.md n8n/workflow-explained.md n8n/n8n-guide.md
```

Expected: every remaining hit is either the `Collect Social Items` node name, or an annotation explicitly stating the reference is dead. **No hit may describe the social app as though it still exists.** Read each line and confirm.

- [x] **Step 6: Verify the doc matches the live workflow**

```bash
PG=$(ssh main-vps 'docker ps --format "{{.Names}}" | grep postgres')
ssh main-vps "docker exec $PG psql -U dokploy -d n8n -Atc \"SELECT name, active, json_array_length(nodes) FROM workflow_entity WHERE name LIKE 'AllOnFire%'\""
```

Expected: `AllOnFire — Topic Discovery|f|57` — inactive, 57 nodes, matching the banner's claim. If the node count differs, correct the banner to the real number.

- [x] **Step 7: Commit**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
git add n8n/README.md n8n/workflow-explained.md
git -c core.checkStat=minimal commit -m "docs(n8n): mark topic discovery parked and flag dead social endpoints"
```

---

### Task 8: Clean the doc-gen skill, `CLAUDE.md`, and local settings

**Files:**
- Modify: `.claude/skills/doc-gen/SKILL.md` (lines ~16, ~143)
- Modify: `.claude/skills/doc-gen/references/doc-map.md` (social screenshot inventory, ~lines 25–39, 61, 69–70, 82, 110)
- Modify: `.claude/skills/doc-gen/references/doc-standards.md` (~lines 102–103, 141–143)
- Modify: `CLAUDE.md` (line 3)
- Modify: `.claude/settings.local.json`
- Possibly modify: `pnpm-lock.yaml` (if Task 1's `pnpm install` changed it)

**Interfaces:**
- Consumes: branch from Task 4
- Produces: the final commit of the PR.

- [x] **Step 1: `SKILL.md` — drop the social app from the screenshot workflow**

At line ~16, replace the prerequisite naming two apps:

```markdown
- Target app running for screenshot capture: Social on `:3100`, Laura on `:3200`
```

with:

```markdown
- Target app running for screenshot capture: Laura on `:3200`
```

At line ~143, replace `consuming files in apps/social/ for usage examples` with `apps/laura/`.

Delete the whole `#### Social App (port 3100)` subsection at ~line 109 and its desktop/mobile screenshot list.

- [x] **Step 2: `doc-map.md` — delete the social screenshot inventory**

Delete every row naming a deleted screenshot: `dashboard`, `discover`, `generate`, `publish-compose`, `publish-platforms`, `publish-preview`, `admin-users`, `admin-providers`, `settings`, `mobile-dashboard`, `mobile-nav`, `mobile-admin`, `mobile-discover`, `mobile-generate`, `mobile-publish`, `mobile-settings`.

Note that `publish-platforms.png`, `publish-preview.png`, and `mobile-nav.png` were already stale — they were listed but never existed on disk.

Keep the entire `### Laura Screenshot Inventory` section.

Also delete the `apps/social/README.md` row (~line 61), the `content-generator` and `social-publisher` rows (~lines 69–70), and the `apps/social/src/features/` structure reference (~line 82) and `content-generator` integration example (~line 110).

- [x] **Step 3: `doc-standards.md` — keep the naming rule, drop its obsolete rationale**

At ~line 102, replace:

```markdown
- **Screenshot naming**: `laura-{page}.png` / `mobile-laura-{page}.png` (prefixed to avoid Social collisions)
```

with:

```markdown
- **Screenshot naming**: `laura-{page}.png` / `mobile-laura-{page}.png`. The
  `laura-` prefix is retained deliberately: unprefixed screenshots belonged to
  the removed social app, so the prefix marks an asset as live. An unprefixed
  PNG in `docs/screenshots/` is legacy and should be deleted, not reused.
```

At ~line 103, replace `**Port**: Laura runs on `:3200` (Social on `:3100`)` with `**Port**: Laura runs on `:3200``.

At ~lines 141–143, the generic naming template shows unprefixed `docs/screenshots/{page-name}.png`. Update it to the `laura-` prefixed form so the template matches the rule above.

This is where the convention already lived. Recording it here rather than in `CLAUDE.md` keeps one home for it.

- [x] **Step 4: `CLAUDE.md` — remove the dangling pointer**

Delete line 3 in its entirety:

```markdown
Read AGENTS.md first for universal conventions. This file adds Claude Code-specific guidance.
```

The sentence has two clauses. Only the `AGENTS.md` pointer is dangling — if you prefer to keep the second clause, the line becomes `This file adds Claude Code-specific guidance.` Either is acceptable; deleting the whole line is simpler.

`AGENTS.md` does not exist — added in `7bac3f5`, deleted in `6a355c7`. Do not recreate it; writing a conventions document is separate work.

- [x] **Step 5: `.claude/settings.local.json` — prune stale permissions**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
grep -n 'social' .claude/settings.local.json
```

Remove each permission entry whose command references `apps/social` or the deleted packages. Keep every other entry untouched. Then confirm the file is still valid JSON:

```bash
cd /Volumes/Crucial-4T/repo/allonfire
python3 -c 'import json,sys; json.load(open(".claude/settings.local.json")); print("valid JSON")'
```

Expected: `valid JSON`.

Note: `.gitignore` contains `.claude/*.local.json`, so this file may be untracked. If `git status` does not show it, edit it anyway for local hygiene and simply do not stage it.

- [x] **Step 6: Verify the whole tree**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
grep -rn 'apps/social\|@repo/social-publisher\|@repo/content-generator\|@repo/video-overlays\|@repo/video-pipeline\|@allonfire/social-publisher\|@allonfire/content-generator' \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next --exclude-dir=.turbo \
  --exclude='pnpm-lock.yaml' . 2>/dev/null | grep -v 'docs/superpowers/'
echo "exit=$? (1 = clean)"
```

Expected: no output, `exit=1`. Hits under `docs/superpowers/` are excluded on purpose — the dated specs and plans are historical records.

- [x] **Step 7: Commit and push**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
git add .claude/skills/doc-gen/SKILL.md \
        .claude/skills/doc-gen/references/doc-map.md \
        .claude/skills/doc-gen/references/doc-standards.md \
        CLAUDE.md
git status --porcelain | grep 'pnpm-lock.yaml' && git add pnpm-lock.yaml
git -c core.checkStat=minimal commit -m "docs(claude): drop social from doc-gen skill and fix dangling AGENTS.md pointer"
git push -u origin chore/social-cleanup
```

Do not open the PR yet — Task 9 gates it.

---

### Task 9: Verify every success criterion, then open the PR

**Files:** none — verification only.

**Interfaces:**
- Consumes: all prior tasks
- Produces: a verified PR ready for review.

- [x] **Step 1: Criteria 1–3 — orphan directories gone, build green**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
for d in apps/social packages/social-publisher packages/content-generator packages/video-overlays packages/video-pipeline; do
  [ -e "$d" ] && echo "FAIL still present: $d" || echo "ok gone: $d"
done
pnpm install && pnpm build && pnpm check-types && pnpm test
```

Expected: five `ok gone:` lines; install, build, type-check, and tests all pass.

- [x] **Step 2: Criterion 4 — keyword sweep**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
grep -ril social --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next \
  --exclude-dir=.turbo --exclude='pnpm-lock.yaml' . 2>/dev/null
```

Expected only: the two `docs/superpowers/specs/2026-07-29-*` and `2026-04-*` files, `docs/superpowers/plans/2026-07-29-remove-social-allonfire.md`, this plan, and the deliberately-annotated `n8n/README.md` and `n8n/workflow-explained.md`. Anything else is a miss.

- [x] **Step 3: Criterion 5 — no orphaned screenshot, anchored matching**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
for f in $(git ls-files docs/screenshots/ | xargs -n1 basename); do
  n=$(grep -rlE "(^|[/\"'(])$(printf '%s' "$f" | sed 's/\./\\./g')" --include='*.md' . 2>/dev/null \
      | grep -v node_modules | wc -l | tr -d ' ')
  [ "$n" -eq 0 ] && echo "FAIL orphan: $f"
done
echo "(no FAIL lines = pass)"
```

Expected: no `FAIL` lines. This criterion, not Step 2's, is what catches dead assets — no social screenshot filename contains the word "social", so a keyword grep passes while dead images remain.

- [x] **Step 4: Criterion 6 — n8n workflow files**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
[ -f n8n/workflows/publishing.json ] && echo "FAIL publishing.json present" || echo "ok publishing.json gone"
[ -f n8n/workflows/topic-discovery.json ] && echo "ok topic-discovery.json kept" || echo "FAIL topic-discovery.json missing"
grep -c 'Status: parked' n8n/README.md n8n/workflow-explained.md
```

Expected: `ok` on both files, and `1` parked-banner occurrence in each doc.

- [x] **Step 5: Criterion 7 — VPS Docker state**

```bash
ssh main-vps 'docker system df; echo "--- social ---"; docker images --format "{{.Repository}}" | grep -i social; echo "(nothing above = pass)"'
```

Expected: no social image; `Build Cache` and dangling images at 0 B.

- [ ] **Step 6: Criterion 8 — live services intact**

```bash
curl -s -o /dev/null -w 'laura -> %{http_code}\n' https://laura.isaiariva.com
PG=$(ssh main-vps 'docker ps --format "{{.Names}}" | grep postgres')
ssh main-vps "docker exec $PG psql -U dokploy -d n8n -Atc \"SELECT name, active FROM workflow_entity ORDER BY name\""
```

Expected: Laura returns `200` or `3xx`. Exactly three workflows: `AllOnFire — Notifications|t`, `AllOnFire — Topic Discovery|f`, `Backup Notification|t`. `My workflow` absent.

- [x] **Step 7: Criterion 9 — no dangling path in `CLAUDE.md`**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
grep -c 'AGENTS.md' CLAUDE.md; echo "(0 = pass)"
```

Expected: `0`.

Do not extend this to every path in `CLAUDE.md` — most apparent misses are relative paths inside code-fence directory trees and resolve correctly in context. `AGENTS.md` was the only genuine top-level dangling reference.

- [x] **Step 8: Open the PR**

```bash
cd /Volumes/Crucial-4T/repo/allonfire
gh pr create --base dev --head chore/social-cleanup \
  --title "chore(docs): remove social app residue from docs and assets" \
  --body "$(cat <<'EOF'
## Summary

Removes documentation and assets describing the social app deleted in #69. No functional change.

- Deleted 13 orphaned social screenshots (13 MB) and the empty `n8n/workflows/publishing.json`
- Rewrote `packages/database/README.md` — 7 of its 12 API sections documented services that no longer exist
- Repointed `auth` / `ui` / `config` README examples at `laura`
- Marked the n8n Topic Discovery workflow parked, and flagged the three dead social-app integration points
- Stripped the social app from the `doc-gen` skill and its references
- Removed the dangling `AGENTS.md` pointer from `CLAUDE.md`

## Kept deliberately

`n8n/workflows/topic-discovery.json` — 57 nodes of collection and ranking logic. Inactive, documented as parked. Only its classification call is broken.

## Verified

All nine success criteria in `docs/superpowers/specs/2026-07-29-social-removal-cleanup-design.md`. Build, type-check, and tests pass. Laura serves; the two active n8n workflows are untouched.

## Companion work, not in this PR

Disk reclaim (~12 GB local + VPS) was operational and committed nothing. Credential revocation for the social app's Twitter/LinkedIn/Google OAuth apps is manual and outstanding — see Track C.
EOF
)"
```

---

## Track C — Credential revocation (user-performed)

Not automatable and not delegable. Deleting `apps/social/.env` in Task 1 removed the local copy of these secrets; it did **not** revoke them. They remain valid at each provider until revoked there.

- [ ] **Revoke the Twitter/X OAuth app** — developer portal → the social app's project → delete or regenerate `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET`.
- [ ] **Revoke the LinkedIn OAuth app** — LinkedIn developer console → the social app → delete or regenerate `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`.
- [ ] **Revoke the Google OAuth client** — Google Cloud console → APIs & Services → Credentials → delete the social app's client.
- [ ] **Confirm nothing else used them.** Laura authenticates through its own BetterAuth configuration with its own secrets. Before deleting a shared Google client, check whether Laura's sign-in uses the same one; if it does, create a Laura-specific client first.

`BETTER_AUTH_SECRET` and `ENCRYPTION_KEY` in the deleted `apps/social/.env` were distinct from the live values in the VPS compose environment, so removing the social copy does not affect Laura.

---

## Follow-up, deliberately out of scope

The `monorepoonfire` Dokploy application: package `monorepoonfire` v2.0.0, serving `www.isaiariva.com` on port 3075, with its own 7.9 MB `monorepoonfire` Postgres database, a dedicated Traefik dynamic config at `/etc/dokploy/traefik/dynamic/monorepoonfire-vdfssdfvasv-ss81s5.yml`, and one exited replica. Its `apps/` and `packages/` directories are empty.

It predates allonfire and is unrelated to the social removal. Recorded here so it is not lost. Any future removal must account for `www.isaiariva.com` carrying live traffic.


## Implementation Log
- Implemented: 2026-07-30T12:15:54Z
- Workspace: named branch — `chore/social-cleanup` (branched from `dev`)
- Committed: yes — 6 cleanup commits, pushed; PR opened against `dev`

### Divergences from the plan
- **Task 1 Step 2** false positive: matches were inside `apps/social/.next/standalone/`, a build artefact within the directory being deleted. Re-ran scoped to surviving code — clean.
- **Task 2 Step 3** no-op: `applications-allonfire-nrnhaj-social:latest` was already absent and build cache already 0 B (likely a Dokploy redeploy reclaimed it). `docker image prune -f` reclaimed 0 B. The three `<none>` images are Swarm-digest-pulled and container-referenced, so not reclaimable — `-a` would have deleted Dokploy's own control plane.
- **Task 4 Step 2** false positive: the plan file itself names all 13 screenshots, so the check can never reach 0. Re-ran excluding `docs/superpowers/` — clean.
- **Task 5 Step 3** table was wrong: the plan's prescribed field names (`Favorite.userId`, `QuizQuestion.question`/`correctAnswer`, `QuizAnswer.userId`/`answer`, `Photo.uploadedById`) do not exist in `schema.prisma`. Used the real schema instead. Also rewrote the `## Usage` and `## Scripts` sections, which the plan did not name but which referenced deleted functions and a nonexistent `db:export-topics` script.
- **Task 7 Step 1**: `n8n/README.md` already had a retirement banner; merged the parked status into it rather than stacking a second blockquote. Annotated 14 dead references, not the plan's 5.
- **Task 8 Step 2**: `doc-map.md` needed a full rewrite — the plan named 5 rows, but a ~50-line `## Features (apps/social/src/features/)` block documented six deleted features.
- **Extra commit** `chore(cleanup)`: criterion 4 surfaced three leftovers absent from the task list — `packages/ui/src/styles/theme-social.css` (still imported by the shadcn CSS target), `SOCIAL_VIEWER_*` in `packages/database/.env.example`, and `social-admin`/`social-user` in `seed-data/users.json`.

### Outstanding
- **Task 3 Step 2** — delete `My workflow` in the n8n UI (still present).
- **Task 3 Step 5** — remove `SOCIAL_VIEWER_EMAIL` / `SOCIAL_VIEWER_PASSWORD` via the Dokploy UI (still 2 entries).
- **Track C** — revoke the Twitter/X, LinkedIn and Google OAuth credentials. Note these also persist in age-encrypted S3 backups until tiered retention expires, so provider-side revocation is the only effective remediation.

### Noted, out of scope
- `n8n/README.md` documents image `docker.n8n.io/n8nio/n8n:2.10.2`; the VPS runs `2.26.3`. Unrelated to social removal.
- `/etc/dokploy/applications/` is 54 MB of `monorepoonfire`, ~86% of each daily backup. Out of scope by decision.
- `packages/database/src/utils/encryption.ts` is unused outside its own test (it served the social app's encrypted credentials). Left in place; removing code was not in scope.