# Social removal cleanup — design

**Date:** 2026-07-29
**Status:** approved
**Context:** PR #69 (`feat/remove-social`) deleted the social app, its exclusive packages, its Prisma models, and its compose service. This spec covers the residue that removal left behind, in the repo and on the production VPS.

## Goal

Remove every artefact of the deleted social app from the allonfire monorepo and the `main` Hetzner VPS, so that no file, image, or document describes a system that no longer exists.

## Findings

### Already clean — no work required

Verified by full-repo sweep and live VPS inspection:

| Area | Status |
|---|---|
| Prisma schema | No `Post`, `Topic`, `SocialAccount`, `Platform` models |
| Root config | No social refs in `turbo.json`, `tsconfig.json`, `biome.jsonc`, `.dockerignore` |
| Workspace deps | No surviving `package.json` depends on `@repo/social-publisher`, `@repo/content-generator`, `@repo/video-overlays`, `@repo/video-pipeline` |
| Docker | `docker-compose.prod.yml` = `laura` + `minio` only; test compose clean |
| CI | No social job, matrix entry, or path filter in `.github/workflows/*` |
| Tracked env | No `SOCIAL_*` / provider keys in tracked `.env*` or `createEnv` schemas |
| Laura + surviving packages | Zero imports of removed packages |
| VPS containers | No social container, running or stopped |
| VPS Traefik | No social route. Live hosts: `laura.`, `minio.`, `n8n.`, `db.`, `monitor.`, `panel.`, `www.`, apex |
| VPS `allonfire` DB | Tables = `Account, Favorite, GameScore, Photo, QuizAnswer, QuizQuestion, Session, User, Verification`. No social tables |

The removal PR was correct. What remains is untracked disk residue and stale prose.

### Residue found

**Local disk — untracked orphan directories (~6.7 GB)**

Invisible to `git status` because their remaining contents are all gitignored build artefacts. No `package.json` survives in any of them, so pnpm's `packages/*` glob does not resolve them.

| Path | Size | Contents |
|---|---|---|
| `apps/social` | 6.0 GB | `.next`, `.next-mobile`, `.turbo`, `node_modules`, `.env`, `tsconfig.tsbuildinfo` |
| `packages/video-overlays` | 624 MB | `.turbo`, `node_modules`, empty `mockups/` + `prompts/` |
| `packages/video-pipeline` | 38 MB | `.turbo`, `dist`, `node_modules`, empty `src/` |
| `packages/content-generator` | 25 MB | `.turbo`, `node_modules` |
| `packages/social-publisher` | 22 MB | `.turbo`, `node_modules` |

**VPS — reclaimable Docker storage (~5.3 GB)**

| Item | Size |
|---|---|
| Image `applications-allonfire-nrnhaj-social:latest` (orphan, no container) | 263 MB |
| 6 dangling images | ~519 MB |
| Build cache (100% reclaimable) | 4.5 GB |

**Stale documentation**

- `n8n/README.md` — documents `N8N_WEBHOOK_BASE_URL` pointing at the social app, `apps/social/src/lib/api-auth.ts`, `apps/social/src/proxy.ts`, and the `/api/classify-topics` endpoint.
- `n8n/workflow-explained.md` — documents the "Collect Social Items" node, the classification POST to the social app, and troubleshooting against `apps/social/.env`.
- `packages/database/README.md` — Social account model documentation.
- `packages/auth/README.md` — example `checkAppAccess(auth, "social")`.
- `packages/ui/README.md` — example import from `apps/social`.
- `packages/config/README.md` — `apps/social` cited as the Next.js app example.
- `.claude/skills/doc-gen/references/doc-map.md` and `doc-standards.md` — list `apps/social/README.md`, `content-generator`, and `social-publisher` in the doc-generation template.
- `.claude/settings.local.json` — stale permission entries naming `apps/social` paths.

**Orphaned screenshots — tracked in git (13 MB)**

`docs/screenshots/` holds 25 PNGs. Laura's are prefixed `laura-` / `mobile-laura-`; the social app's are **unprefixed**. That convention was never written down, which is why `settings.png` reads as live until you check with anchored-path matching — substring grep for `settings.png` also matches `laura-settings.png` and `mobile-laura-settings.png`.

Verified orphaned (referenced by nothing except `doc-gen/references/doc-map.md`, which this spec deletes):

`admin-providers`, `admin-users`, `dashboard`, `discover`, `generate`, `publish-compose`, `settings`, `mobile-admin`, `mobile-dashboard`, `mobile-discover`, `mobile-generate`, `mobile-publish`, `mobile-settings`

All 12 `laura-*` / `mobile-laura-*` files are live, referenced from `apps/laura/README.md` and six feature READMEs. They stay.

**Dangling documentation reference**

`CLAUDE.md:3` reads "Read AGENTS.md first for universal conventions." `AGENTS.md` does not exist — added in the init commit `7bac3f5`, deleted in `6a355c7` (a social *feature* commit, so its removal was collateral and predates PR #69). The other apparent missing paths in `CLAUDE.md` are relative paths inside code-fence trees and resolve correctly in context; `AGENTS.md` is the only genuine dangling top-level reference.

**Dead configuration**

- VPS compose `.env` carries `SOCIAL_VIEWER_EMAIL` and `SOCIAL_VIEWER_PASSWORD`. Laura's equivalents (`LAURA_VIEWER_*`) are live and stay.
- `n8n/workflows/publishing.json` has **zero nodes** — a gutted stub of the social publishing workflow, with no VPS counterpart and no references.

**n8n workflow state (verified against the live `n8n` database)**

| Workflow | Active | References social | Nodes | Repo counterpart |
|---|---|---|---|---|
| `AllOnFire — Notifications` | yes | no | 4 | `n8n/workflows/notifications.json` |
| `Backup Notification` | yes | no | 6 | **none — VPS-only, unversioned** |
| `AllOnFire — Topic Discovery` | no | **yes** (`/api/classify-topics`) | 57 | `n8n/workflows/topic-discovery.json` |
| `My workflow` | no | no | 4 | none |

`My workflow` is unnamed scratch work, not social residue — it has four nodes and references nothing social. It is in scope only as general junk.

Nothing is currently failing: the one workflow that calls the deleted endpoint is already inactive.

**Live credentials**

`apps/social/.env` contains `TWITTER_CLIENT_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, and `VIEWER_EMAIL/PASSWORD`.

## Design

Three independent tracks. Only Track B produces a commit.

### Track A — Disk reclaim

Pure operations, no code change, nothing committed.

Local:
1. Delete the five orphan directories.
2. Run `pnpm install` afterwards to resync workspace link state.

VPS (read-only inspection is complete; these are the only mutations):
1. Remove the orphan `applications-allonfire-nrnhaj-social:latest` image.
2. `docker image prune` — 6 dangling images.
3. `docker builder prune` — 4.5 GB of build cache.
4. Delete the `My workflow` n8n workflow via the n8n UI.
5. Remove `SOCIAL_VIEWER_EMAIL` and `SOCIAL_VIEWER_PASSWORD` via the Dokploy UI, not by editing `/etc/dokploy/compose/.../docker/.env` directly — Dokploy renders that file from its own database and overwrites it on the next deploy.

Docker artefacts deleted here regenerate from source on the next install or deploy. No backup required.

**Guard — do not touch `Backup Notification`.** It is active, social-free, and the only live workflow with no repo counterpart, so it exists nowhere but this VPS. Deleting it would be unrecoverable. Before deleting `My workflow`, confirm by name that `Backup Notification`, `AllOnFire — Notifications`, and `AllOnFire — Topic Discovery` are all still present.

### Track B — Stale documentation

Single PR on `chore/social-cleanup`.

**Rewrite, do not delete**, the two n8n documents. Two workflows are genuinely still running on the VPS, so these files retain a live subject; they need their scope narrowed to `Notifications` and `Backup Notification` and their social sections removed. Deleting them would trade one wrong document for zero documents.

**Rewrite examples** in the four package READMEs to reference `laura` instead of `apps/social`. The examples illustrate real APIs that still exist — only the subject app is stale.

**Strip entries** from the two `doc-gen` reference files and from `.claude/settings.local.json`.

**Delete** the 13 orphaned screenshots and `n8n/workflows/publishing.json`. The screenshots go in the same commit that strips their only reference from `doc-map.md`, so the reference and the referent die together and the tree is never in a half-broken state.

**Park, don't delete**, `n8n/workflows/topic-discovery.json` and its VPS counterpart. It holds 57 nodes of genuine pipeline work whose only broken part is one HTTP call. Both n8n documents keep their topic-discovery sections, rewritten to state plainly that the workflow is parked and inactive because no surviving app serves `/api/classify-topics`. A parked workflow with an honest note costs nothing; deleting it discards work that becomes valuable again the moment content automation returns.

**Delete one sentence** from `CLAUDE.md:3` — the `AGENTS.md` pointer. Do not recreate `AGENTS.md`; writing a universal-conventions document is new work and belongs in its own spec.

**Record the screenshot naming convention** in `CLAUDE.md`, where repo conventions already live: assets prefixed `laura-` belong to Laura, unprefixed assets are legacy social. This is the convention whose absence made `settings.png` look live. It goes in `CLAUDE.md` rather than a new `CONTEXT.md` — one naming rule does not justify a new top-level document, and `CLAUDE.md` is where a reader would look.

**Leave alone**: `docs/superpowers/specs/2026-04-*`. Those are dated historical specs and were accurate when written. Rewriting history in a spec archive destroys its value.

### Track C — Credential revocation (manual, user-performed)

Deleting `apps/social/.env` in Track A removes the local copy of the secrets. It does not revoke them. The following must be done by the user, in each provider's own console:

- Revoke or delete the Twitter/X OAuth app.
- Revoke or delete the LinkedIn OAuth app.
- Revoke or delete the Google OAuth client.

Separately, remove `SOCIAL_VIEWER_EMAIL` and `SOCIAL_VIEWER_PASSWORD` from the VPS compose environment via the Dokploy UI.

`BETTER_AUTH_SECRET` and `ENCRYPTION_KEY` in `apps/social/.env` are distinct from the values in the live VPS compose `.env`; deleting the social copy does not affect Laura.

### Sequencing

Tracks A, B, and C are independent and may run in any order. Track A should precede Track B only to avoid a stale `apps/social/.env` reappearing in a doc-verification grep.

## Out of scope

The `monorepoonfire` Dokploy application — package `monorepoonfire` v2.0.0, serving `www.isaiariva.com` on port 3075, with its own 7.9 MB `monorepoonfire` Postgres database, a dedicated Traefik dynamic config, and one exited replica. Its `apps/` and `packages/` directories are empty. It predates allonfire and is unrelated to the social removal.

Recorded here as a follow-up. This spec proposes no change to it, and any future removal must account for `www.isaiariva.com` being live traffic.

## Success criteria

1. `apps/social` and the four orphan package directories are absent from disk.
2. `git status` on `dev` reports no new tracked changes after Track A. If `pnpm install` rewrites `pnpm-lock.yaml`, that diff is expected and committed with Track B.
3. `pnpm install && pnpm build && pnpm check-types` pass unchanged.
4. `grep -ril social` across tracked files returns only: this spec, `docs/superpowers/plans/2026-07-29-remove-social-allonfire.md`, `docs/superpowers/specs/2026-04-*`, and the parked-workflow notes in the two n8n documents.
5. Every PNG in `docs/screenshots/` is referenced by at least one tracked markdown file, checked with anchored-path matching rather than substring matching. This criterion, not criterion 4, is what catches orphaned assets — no social screenshot filename contains the word "social", so a keyword grep passes while 13 MB of dead images remain.
6. `n8n/workflows/publishing.json` is absent; `topic-discovery.json` is present and documented as parked.
7. `docker system df` on the VPS reports build cache and dangling images at zero, and no social image present.
8. Laura remains reachable at `laura.isaiariva.com`. `AllOnFire — Notifications` and `Backup Notification` are both still present and active. `My workflow` is gone.
9. No path referenced from `CLAUDE.md` outside a code fence is missing.

## Risks

| Risk | Mitigation |
|---|---|
| `rm -rf` targets a wrong path | Paths are enumerated literally in the plan; each is verified untracked via `git ls-files` before deletion |
| Deleting build caches slows the next build | Accepted. One-time cost, ~12 GB reclaimed |
| Rewritten n8n docs drift from the live workflows | Verify each rewritten claim against the live workflow list before merging |
| Provider credentials remain valid after file deletion | Track C is explicit and user-performed; this spec does not treat file deletion as revocation |
| A live Laura screenshot is deleted as an orphan | Anchored-path matching, never substring. `settings.png` is an orphan and `laura-settings.png` is live; a substring grep conflates them |
| `Backup Notification` is deleted while removing `My workflow` | It is VPS-only and unversioned, so loss is permanent. Confirm all three surviving workflows by name before and after the deletion |
| Dropping the dead VPS env vars by editing `.env` on disk | Dokploy regenerates that file from its own database on deploy; the edit must go through the Dokploy UI or it silently reverts |
