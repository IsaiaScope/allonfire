# Old Laura on the VPS: read-only inventory

Date: 2026-11-17. Host `main` (188.245.174.30), reached with `/hetzner-ssh`, list commands only; nothing was changed. Input to Phase 7 of `docs/superpowers/plans/2026-11-17-laura-p7-cutover.md`.

## Result

Old Laura is already gone from the VPS. The only Laura items left are ones the rebuilt Laura needs, or that Phase 6 removes by changeset.

| Item | Where | Found | New Laura needs it? | Action |
|---|---|---|---|---|
| Containers named or labelled laura | Docker | none (20 running containers, none Laura) | no | nothing |
| Images `*laura*` | Docker host | none | no | nothing |
| Volumes and networks `*laura*` | Docker host | none | no | nothing |
| Traefik routes naming Laura | `/etc/dokploy/traefik/dynamic/*.yml` | none | Phase 7 adds `allonfire-laura` | nothing to delete |
| `LAURA_*` keys | `/etc/dokploy/compose/applications-allonfire-nrnhaj/.env` | none | yes: `LAURA_HOST`, `LAURA_URL` added by Phase 3/7 | add, never delete |
| Redis keys `*laura*` | allonfire Redis | none | no | nothing |
| MinIO buckets | allonfire storage | `image`, `telemetry` only (no `laura` bucket) | the `image` bucket, untouched | nothing |
| Postgres schema `laura` | database `allonfire` | present, one table `GameScore`, 0 rows, enum `GameType` = `MEMORY`, `QUIZ` | yes: `GameScore` and the schema stay | Phase 6 changeset drops `QUIZ` (no rows to delete) |
| Memberships | `auth."Membership"` | 2 rows, both ADMIN (back-office 1, laura 1); no VIEWER row | yes | Phase 0 changeset has nothing to convert here |
| `image."ImageApp"` rows | database `allonfire` | none (no Image is stored yet) | yes | Laura's gallery starts empty: photos are uploaded after the rebuild |
| Liquibase changesets applied | `databasechangelog` | 8 | yes | Phase 0 adds the next one |
| GitHub secrets and variables | repo | `TURBO_TOKEN`, `TURBO_TEAM` only; no workflow names Laura | no | nothing |
| GHCR package `allonfire-laura` | `ghcr.io/isaiascope` | not checked: `gh` lacks the `read:packages` scope | no | the owner looks at github.com/IsaiaScope?tab=packages and deletes it by hand if it exists |
| Cloudflare DNS `laura.` | Cloudflare | proxied, answers 404 (`docs/guides/vps.md`) | yes | KEEP |
| Checkout of the repo with `apps/laura` | `/etc/dokploy/compose/applications-allonfire-nrnhaj/code` | Dokploy's own clone | n/a | rewritten by the next deploy; not touched |

## Not Laura, found on the way

- `monorepoonfire-vdfssdfvasv-ss81s5` (Dokploy application, own database `monorepoonfire`, role `mof`): another project, listed in `vps-other-apps.md` territory. Not touched.
- Housekeeping outside Laura's scope: 9 unused anonymous Docker volumes and up to 1.88 GB of reclaimable image layers (`docker system df`: images 14.6 GB, 12% reclaimable). Disk is at 34% (25 GB of 75 GB), so nothing is urgent. A prune is the owner's call, after looking at the volume list.

## Left on the owner's Mac (not the VPS)

- `apps/laura/seed-photos/` (492 MB, 172 JPEGs) and the Local MinIO `laura` bucket (75 MB): the only copy of the old photos. Upload them through the new Admin Upload section first, then delete. Never before.
- Gitignored build leftovers in `apps/laura` (`.next*`, `test-results`, `tsconfig.tsbuildinfo`): deleted with the old source.

## What Phase 7 does with this

- No VPS delete task for old Laura (nothing exists). The plan keeps a short post-deploy check that the VPS still holds none of the items above, and the keep list.
- Adds the production wiring the rebuilt Laura needs (compose service, `LAURA_HOST`, `LAURA_URL`, CORS origin).
- Owner hand tasks: GHCR package check, `seed-photos` and Local bucket deletion after the upload, optional Docker prune.
