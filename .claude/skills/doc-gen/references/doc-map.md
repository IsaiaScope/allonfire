# Documentation Map

Complete inventory of every documentation target in the AllOnFire monorepo.

## Root Level

| File | Priority | Content Requirements |
|------|----------|---------------------|
| `README.md` | P0 | Badges, screenshot grid, "What is AllOnFire?", architecture ASCII, quick start table, scripts, tech stack, packages table, doc links |
| `CLAUDE.md` | — | EXISTS. Social app structure, routes, features, import rules, deployment. Keep current. |
| `.claude/CLAUDE.md` | — | EXISTS. Ultracite/Biome code standards. Stable. |

## Docs Directory

| File | Priority | Content Requirements |
|------|----------|---------------------|
| `docs/screenshots/` | P1 | Directory for committed screenshots (see screenshot inventory below) |
| `docs/00-overview.md` | P1 | Project goals, high-level description, links to all docs |
| `docs/01-architecture.md` | P1 | System architecture diagrams, data flow (discovery, generation, publishing, OAuth), package dependency graph |
| `docs/02-database.md` | P2 | Prisma schema reference, ER diagram (Mermaid), service layer API table, encryption details |
| `docs/03-deployment.md` | P2 | Hetzner VPS, Dokploy, Docker, Traefik SSL, environment variables |
| `docs/04-development.md` | P1 | Local setup, prerequisites, env vars, Docker dev stack, testing, linting |

### Screenshot Inventory

| File | Page URL | Notes |
|------|----------|-------|
| `docs/screenshots/dashboard.png` | `/` | Overview with stats |
| `docs/screenshots/discover.png` | `/discover` | Topic discovery list |
| `docs/screenshots/generate.png` | `/generate` | Generation queue |
| `docs/screenshots/publish-compose.png` | `/publish` | Wizard step 1: compose |
| `docs/screenshots/publish-platforms.png` | `/publish` | Wizard step 2: platforms |
| `docs/screenshots/publish-preview.png` | `/publish` | Wizard step 3: preview |
| `docs/screenshots/admin-users.png` | `/admin/users` | User management |
| `docs/screenshots/admin-providers.png` | `/admin/providers` | AI provider config |
| `docs/screenshots/settings.png` | `/settings/general` | Webhook config |
| `docs/screenshots/mobile-dashboard.png` | `/` (390x844) | Mobile responsive |
| `docs/screenshots/mobile-nav.png` | `/` (390x844) | Sheet menu open |

### Laura Screenshot Inventory

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
| `apps/social/README.md` | P0 | App overview, route map table, feature layer, env vars (from `src/env.ts`), auth setup, dev commands |
| `apps/laura/README.md` | P0 | App overview, route map table, feature gallery, i18n setup, role system, env vars, dev commands |

## Packages

| File | Priority | Content Requirements |
|------|----------|---------------------|
| `packages/database/README.md` | P0 | Schema overview (models table), service API (exported functions), encryption (AES-256-GCM), enums, seed/migration commands |
| `packages/content-generator/README.md` | P1 | Prompt system (meta-prompt, type prompts), platform rules, provider adapters, CLI, token budget |
| `packages/social-publisher/README.md` | P1 | Platform adapters (LinkedIn, Twitter), OAuth flow, image processing (resize specs), publish types |
| `packages/ui/README.md` | P1 | Component inventory table, shadcn/ui setup, globals.css, cn utility, usage patterns |
| `packages/hooks/README.md` | P2 | Breakpoint constants, useBreakpoint, useMounted, usage in sidebar-layout |
| `packages/utils/README.md` | P2 | Utility functions: objectKeys, objectEntries, formatErrorMessage |
| `packages/config/README.md` | P3 | TypeScript config presets |

## n8n

| File | Priority | Notes |
|------|----------|-------|
| `n8n/README.md` | — | EXISTS. Comprehensive. Keep current. |

## Features (`apps/social/src/features/`)

### Reference Feature (fully documented)

| File | Notes |
|------|-------|
| `sidebar-layout/README.md` | EXISTS. Use as template for all other features. |
| `sidebar-layout/CLAUDE.md` | EXISTS. Use as template for all other features. |

### publish (P0 — most complex)

| File | Content Requirements |
|------|---------------------|
| `publish/README.md` | Multi-step wizard architecture, step descriptions (compose, platforms, preview, confirm, results), state management (`usePublishWizard` with `loadingPhase`), OAuth connection flow, image upload with drag-to-reorder, content adaptation pipeline, shared platform constants |
| `publish/CLAUDE.md` | File responsibilities for: 10 components, 1 hook, 2 actions, 1 constants file, 1 types file. Wizard state machine. OAuth popup handling. How to add a new platform. How to add a wizard step. Gotchas: token refresh, image limits, `biome-ignore` on img elements |

### admin (P1)

| File | Content Requirements |
|------|---------------------|
| `admin/README.md` | User CRUD + AI provider management, sub-nav routing (`/admin/users`, `/admin/providers`), role-based guard, provider verification, API key encryption |
| `admin/CLAUDE.md` | File responsibilities: admin-sub-nav, add-user-form, user-list, user-detail, provider-card, provider-config-panel, providers-hub, provider-icons. Actions: providers.ts, users.ts |

### generation (P1)

| File | Content Requirements |
|------|---------------------|
| `generation/README.md` | Generation trigger, queue monitoring, topic-to-post pipeline |
| `generation/CLAUDE.md` | File responsibilities: generate-button. Action: generate.ts. How it calls content-generator |

### topics (P1)

| File | Content Requirements |
|------|---------------------|
| `topics/README.md` | Topic discovery display, filtering, selection, archive flow, status lifecycle |
| `topics/CLAUDE.md` | File responsibilities: topic-actions, topic list components. How topics flow from n8n webhook to UI |

### overview (P2)

| File | Content Requirements |
|------|---------------------|
| `overview/README.md` | Dashboard stats display, pipeline-stats component, data sources |
| `overview/CLAUDE.md` | Standalone feature, no cross-feature deps |

### settings (P2)

| File | Content Requirements |
|------|---------------------|
| `settings/README.md` | Webhook URL configuration, settings sub-nav, form validation |
| `settings/CLAUDE.md` | How settings connect to n8n webhooks |

## Laura Features (`apps/laura/src/features/`)

### Reference: Use Social's `sidebar-layout/` as template

| Feature | Priority | Content Requirements |
|---------|----------|---------------------|
| `gallery/README.md` + `CLAUDE.md` | P1 | Masonry grid, infinite scroll, favorites, photo preview, blurhash placeholders, gallery actions |
| `games/README.md` + `CLAUDE.md` | P0 | Memory game (card matching, timer, scoring), Quiz game (multiple choice, images, CRUD), leaderboards, game hooks |
| `upload/README.md` + `CLAUDE.md` | P1 | Drag-drop upload, HEIC conversion, S3/MinIO storage, file validation, upload preview |
| `settings/README.md` + `CLAUDE.md` | P2 | Language switcher (IT/EN), appearance toggle, user info card, sign out |
| `layout/README.md` + `CLAUDE.md` | P2 | TopBar, page container, desktop/mobile navigation, UserRoleProvider integration |

## Memory Files

| File | Status | Notes |
|------|--------|-------|
| `MEMORY.md` | EXISTS | Index file — update when adding new memories |
| `project_structure.md` | STALE | References old feature names — update to reflect admin/, publish/ |
| `feedback_*.md` (6 files) | EXISTS | Stable preferences |
| `reference_gh_account.md` | EXISTS | GitHub account |
| `project_prompt_generation.md` | EXISTS | Prompt workflow |
| `project_documentation.md` | MISSING | Add: where docs live, doc-gen standards, screenshot conventions |

## Priority Legend

- **P0**: Must have — root README, app READMEs (social + laura), database README, publish/games feature docs
- **P1**: Should have — architecture guides, remaining package READMEs, gallery/upload/admin/topics feature docs
- **P2**: Nice to have — simple feature docs (settings, layout, overview), deployment guide
- **P3**: Low priority — config package README
