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

**Dead configuration**

- VPS compose `.env` carries `SOCIAL_VIEWER_EMAIL` and `SOCIAL_VIEWER_PASSWORD`. Laura's equivalents (`LAURA_VIEWER_*`) are live and stay.
- n8n workflow `AllOnFire — Topic Discovery` references the deleted `/api/classify-topics` endpoint. It is **inactive** (`active = f`), so nothing is currently failing. `AllOnFire — Notifications` and `Backup Notification` are active and social-free. `My workflow` is an unnamed empty stub.

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

Everything deleted here regenerates from source on the next install or deploy. No backup required.

### Track B — Stale documentation

Single PR on `chore/social-cleanup`.

**Rewrite, do not delete**, the two n8n documents. Two workflows are genuinely still running on the VPS, so these files retain a live subject; they need their scope narrowed to `Notifications` and `Backup Notification` and their social sections removed. Deleting them would trade one wrong document for zero documents.

**Rewrite examples** in the four package READMEs to reference `laura` instead of `apps/social`. The examples illustrate real APIs that still exist — only the subject app is stale.

**Strip entries** from the two `doc-gen` reference files and from `.claude/settings.local.json`.

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
4. `grep -ril social` across tracked files returns only: this spec, `docs/superpowers/plans/2026-07-29-remove-social-allonfire.md`, and `docs/superpowers/specs/2026-04-*`.
5. `docker system df` on the VPS reports build cache and dangling images at zero, and no social image present.
6. Laura remains reachable at `laura.isaiariva.com`, and the two active n8n workflows still run.

## Risks

| Risk | Mitigation |
|---|---|
| `rm -rf` targets a wrong path | Paths are enumerated literally in the plan; each is verified untracked via `git ls-files` before deletion |
| Deleting build caches slows the next build | Accepted. One-time cost, ~12 GB reclaimed |
| Rewritten n8n docs drift from the live workflows | Verify each rewritten claim against the live workflow list before merging |
| Provider credentials remain valid after file deletion | Track C is explicit and user-performed; this spec does not treat file deletion as revocation |
