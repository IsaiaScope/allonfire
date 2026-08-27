# Documentation Map

Complete inventory of every documentation target in the AllOnFire monorepo.

> The Social app was removed on 2026-07-29. Laura is the only app. Anything the
> social app owned — the `publish/`, `admin/`, `generation/`, `topics/`,
> `overview/` and `settings/` features, its screenshots, and the
> `content-generator` / `social-publisher` packages — is gone and is no longer
> listed here.

## Root Level

| File | Priority | Content Requirements |
|------|----------|---------------------|
| `README.md` | P0 | Badges, screenshot grid, "What is AllOnFire?", architecture ASCII, quick start table, scripts, tech stack, packages table, doc links |
| `CLAUDE.md` | — | EXISTS. Laura app structure, routes, features, import rules, deployment. Keep current. |
| `.claude/CLAUDE.md` | — | EXISTS. Ultracite/Biome code standards. Stable. |

## Docs Directory

None of the numbered guides below exist yet — they are targets, not records.

| File | Priority | Content Requirements |
|------|----------|---------------------|
| `docs/screenshots/` | P1 | EXISTS. Directory for committed screenshots (see inventory below) |
| `docs/00-overview.md` | P1 | Project goals, high-level description, links to all docs |
| `docs/01-architecture.md` | P1 | System architecture diagrams, data flow (auth, photo upload, gallery pagination, games/leaderboards), package dependency graph |
| `docs/02-database.md` | P2 | Prisma schema reference, ER diagram (Mermaid), service layer API table |
| `docs/03-deployment.md` | P2 | Hetzner VPS, Dokploy, Docker, Traefik SSL, environment variables |
| `docs/04-development.md` | P1 | Local setup, prerequisites, env vars, Docker dev stack, testing, linting |

### Laura Screenshot Inventory

Every screenshot uses the `laura-` / `mobile-laura-` prefix. An unprefixed PNG in
`docs/screenshots/` is legacy social-app output and should be deleted, not reused.

| File | Page URL | App | Notes |
|------|----------|-----|-------|
| `docs/screenshots/laura-gallery.png` | `/` | Laura (:3200) | Masonry photo grid |
| `docs/screenshots/mobile-laura-gallery.png` | `/` (390x844) | Laura | Mobile gallery |
| `docs/screenshots/laura-upload.png` | `/upload` | Laura | Upload dropzone |
| `docs/screenshots/mobile-laura-upload.png` | `/upload` (390x844) | Laura | Mobile upload |
| `docs/screenshots/laura-games.png` | `/games` | Laura | Game hub |
| `docs/screenshots/mobile-laura-games.png` | `/games` (390x844) | Laura | Mobile game hub |
| `docs/screenshots/laura-memory.png` | `/games/memory` | Laura | Memory board |
| `docs/screenshots/mobile-laura-memory.png` | `/games/memory` (390x844) | Laura | Mobile memory |
| `docs/screenshots/laura-quiz.png` | `/games/quiz` | Laura | Quiz question |
| `docs/screenshots/mobile-laura-quiz.png` | `/games/quiz` (390x844) | Laura | Mobile quiz |
| `docs/screenshots/laura-settings.png` | `/settings` | Laura | Settings page |
| `docs/screenshots/mobile-laura-settings.png` | `/settings` (390x844) | Laura | Mobile settings |

## Apps

| File | Priority | Content Requirements |
|------|----------|---------------------|
| `apps/laura/README.md` | P0 | EXISTS. App overview, route map table, feature gallery, i18n setup, role system, env vars, dev commands |

## Packages

| File | Priority | Content Requirements |
|------|----------|---------------------|
| `packages/database/README.md` | P0 | EXISTS. Schema overview (models table), service API (exported functions), enums, seed/migration commands |
| `packages/auth/README.md` | P1 | EXISTS. BetterAuth setup, app-access guard (`checkAppAccess`), mutation guard, session helpers |
| `packages/storage/README.md` | P1 | EXISTS. S3/MinIO client, upload helpers, bucket config |
| `packages/ui/README.md` | P1 | EXISTS. Component inventory table, shadcn/ui setup, globals.css, cn utility, usage patterns |
| `packages/hooks/README.md` | P2 | EXISTS. Breakpoint constants, useBreakpoint, useMounted |
| `packages/utils/README.md` | P2 | EXISTS. Utility functions: objectKeys, objectEntries, formatErrorMessage |
| `packages/config/README.md` | P3 | EXISTS. TypeScript config presets |

## Laura Features (`apps/laura/src/features/`)

All five features have both a `README.md` and a `CLAUDE.md`. Use any existing pair
as the template for new features.

| Feature | Priority | Content Requirements |
|---------|----------|---------------------|
| `gallery/README.md` + `CLAUDE.md` | P1 | EXISTS. Masonry grid, infinite scroll, favorites, photo preview, blurhash placeholders, gallery actions |
| `games/README.md` + `CLAUDE.md` | P0 | EXISTS. Memory game (card matching, timer, scoring), Quiz game (multiple choice, images, CRUD), leaderboards, game hooks |
| `upload/README.md` + `CLAUDE.md` | P1 | EXISTS. Drag-drop upload, HEIC conversion, S3/MinIO storage, file validation, upload preview |
| `settings/README.md` + `CLAUDE.md` | P2 | EXISTS. Language switcher (IT/EN), appearance toggle, user info card, sign out |
| `layout/README.md` + `CLAUDE.md` | P2 | EXISTS. TopBar, page container, desktop/mobile navigation, UserRoleProvider integration |

## Memory Files

These live in the user's global Claude memory directory, not in this repo, so
doc-gen cannot read or verify them. Statuses below are unverified from here.

| File | Notes |
|------|-------|
| `MEMORY.md` | Index file — update when adding new memories |
| `project_structure.md` | Assume stale: it described the removed social features. Should reflect Laura's `gallery`/`games`/`upload`/`settings`/`layout` |
| `feedback_*.md` | Stable preferences |
| `reference_gh_account.md` | GitHub account |
| `project_prompt_generation.md` | Prompt workflow — was social-app oriented; re-check relevance |
| `project_documentation.md` | Candidate: where docs live, doc-gen standards, screenshot conventions |

## Priority Legend

- **P0**: Must have — root README, `apps/laura/README.md`, database README, games feature docs
- **P1**: Should have — architecture guides, remaining package READMEs, gallery/upload feature docs
- **P2**: Nice to have — simple feature docs (settings, layout), deployment guide
- **P3**: Low priority — config package README
