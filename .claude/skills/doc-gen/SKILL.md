---
name: doc-gen
description: >
  Generate and maintain project documentation — README files, CLAUDE.md guides, docs/ architecture guides,
  Playwright screenshots, and ASCII/Mermaid diagrams for the AllOnFire monorepo. Use when asked to
  "generate docs", "create README", "update documentation", "refresh screenshots", "audit docs",
  "document this feature", "add docs", or "doc-gen".
---

# Doc-Gen Skill

Generate and maintain documentation for the AllOnFire monorepo following established visual and structural patterns from the rd-ivs and wizard projects.

## Prerequisites

- Social app running (`pnpm dev`) for screenshot capture
- Playwright MCP tools available for browser automation
- Read [references/doc-standards.md](references/doc-standards.md) for visual formatting rules
- Read [references/doc-map.md](references/doc-map.md) for the full inventory of documentation targets

## Scope Argument

The skill accepts a scope argument to control what gets generated:

| Scope | What it does |
|-------|-------------|
| `audit` | Scan and report which docs are missing/stale (default, dry-run) |
| `root` | Generate root README.md with badges, screenshot grid, architecture |
| `packages` | Generate README.md for each package missing one |
| `features` | Generate README.md + CLAUDE.md for each feature |
| `screenshots` | Capture Playwright screenshots of all app pages |
| `diagrams` | Generate architecture diagrams and docs/ guides |
| `memory` | Update .claude memory files |
| `all` | Execute all phases in priority order |

If no scope is provided, default to `audit`.

## Workflow

### Phase 1: Audit Existing Documentation

Always run this first, regardless of scope.

1. Scan for all `README.md`, `CLAUDE.md`, and `docs/` directories:

```bash
find . -maxdepth 5 \( -name "CLAUDE.md" -o -name "README.md" \) ! -path "*/node_modules/*" ! -path "*/.next/*" | sort
find . -maxdepth 3 -type d -name "docs" ! -path "*/node_modules/*" | sort
```

2. Compare against the inventory in [references/doc-map.md](references/doc-map.md)
3. Report a table:

```
## Documentation Audit

| File | Status | Priority |
|------|--------|----------|
| README.md | MISSING | P0 |
| apps/social/README.md | MISSING | P0 |
| packages/database/README.md | MISSING | P0 |
| ... | ... | ... |
```

4. If scope is `audit`, stop here and present the table to the user

### Phase 2: Screenshots (`scope: screenshots`)

Capture screenshots before generating docs (root README needs them for the grid).

Save all screenshots to `docs/screenshots/` (NOT `screenshots/` which is gitignored).

#### Desktop Screenshots (1440x900)

1. `browser_resize` to 1440x900
2. `browser_navigate` to `http://localhost:3100`
3. Login if needed, then capture each page:

| File | URL | Notes |
|------|-----|-------|
| `docs/screenshots/dashboard.png` | `/` | Overview with stats |
| `docs/screenshots/discover.png` | `/discover` | Topic discovery list |
| `docs/screenshots/generate.png` | `/generate` | Generation queue |
| `docs/screenshots/publish-compose.png` | `/publish` | Wizard step 1 |
| `docs/screenshots/publish-platforms.png` | `/publish` | Click Next to step 2 |
| `docs/screenshots/publish-preview.png` | `/publish` | Click Next to step 3 |
| `docs/screenshots/admin-users.png` | `/admin/users` | User management |
| `docs/screenshots/admin-providers.png` | `/admin/providers` | AI providers |
| `docs/screenshots/settings.png` | `/settings/general` | Webhook config |

#### Mobile Screenshots (390x844)

1. `browser_resize` to 390x844
2. Capture:

| File | URL | Notes |
|------|-----|-------|
| `docs/screenshots/mobile-dashboard.png` | `/` | Mobile responsive |
| `docs/screenshots/mobile-nav.png` | `/` | Open sheet menu first |

### Phase 3: Root README (`scope: root`)

Create `README.md` at project root with this structure:

1. **Header** (HTML centered):
   - Project name in styled HTML `<h1 align="center">`
   - Tagline: `<p align="center"><strong>AI-powered social media content pipeline</strong></p>`
   - Badge row: Next.js, React, TypeScript, Prisma, Tailwind, pnpm

2. **Screenshot grid** (HTML centered, 3 per row):
   ```html
   <p align="center">
     <img src="docs/screenshots/dashboard.png" width="260" />
     &nbsp;&nbsp;
     <img src="docs/screenshots/discover.png" width="260" />
     &nbsp;&nbsp;
     <img src="docs/screenshots/generate.png" width="260" />
   </p>
   ```

3. **What is AllOnFire?** — 3-4 sentences describing the automated pipeline

4. **Pipeline flow** (ASCII):
   ```
   Discover ──> Classify ──> Generate ──> Adapt ──> Publish
   ```

5. **Architecture diagram** (ASCII, max 7 nodes):
   ```
   ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐
   │  n8n Cron    │───>│  Social App API  │───>│  PostgreSQL   │
   │  (Discovery) │    │  (Next.js)       │    │  (Prisma)     │
   └─────────────┘    └──────────────────┘    └───────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              ┌─────┴──────┐    ┌──────┴───────┐
              │  Content   │    │   Social     │
              │  Generator │    │   Publisher  │
              └────────────┘    └──────────────┘
   ```

6. **Quick Start table**: clone, install, docker, db:push, seed, dev
7. **Scripts table**: key pnpm commands
8. **Packages table**: name, description
9. **Documentation links table**: pointing to docs/ guides and package READMEs

### Phase 4: Package READMEs (`scope: packages`)

For each package missing a README, generate one using this template from [references/doc-standards.md](references/doc-standards.md):

1. `# @allonfire/{name}` title
2. One-line description
3. **API Reference table**: exported functions/types
4. **Directory Structure**: tree of src/ files
5. **Usage Examples**: 2-3 code snippets from the social app
6. **Dependencies table**: package, why

Read the package's `src/index.ts` (or main export) to discover the API surface. Read consuming files in `apps/social/` to find usage examples.

Packages to document (priority order):
- `packages/database/README.md` — P0
- `packages/content-generator/README.md` — P1
- `packages/social-publisher/README.md` — P1
- `packages/ui/README.md` — P1
- `packages/hooks/README.md` — P2
- `packages/utils/README.md` — P2

Also generate `apps/social/README.md` (P0):
- Route map table (from CLAUDE.md)
- Feature layer description
- Environment variables table (read `src/env.ts`)
- Development commands

### Phase 5: Feature Documentation (`scope: features`)

For each feature in `apps/social/src/features/`, generate both README.md and CLAUDE.md.

**Use `sidebar-layout/` as the template** — read both its README.md and CLAUDE.md, then replicate that exact structure for each feature.

README.md structure:
1. Feature description (1-2 sentences)
2. Directory structure tree
3. Component hierarchy (ASCII)
4. Data flow descriptions for key interactions
5. Key components table (file, purpose)
6. Import patterns with code examples

CLAUDE.md structure:
1. Feature scope (owns / does not own)
2. File responsibilities table
3. Modification guide (how to add X, change Y)
4. Gotchas (non-obvious behavior)
5. Dependencies table

Features to document (priority order):
- `publish/` — P0 (most complex: wizard, OAuth, adapters)
- `admin/` — P1
- `generation/` — P1
- `topics/` — P1
- `overview/` — P2
- `settings/` — P2

**Important:** Read every file in the feature directory before writing. Document what actually exists, not what you assume.

### Phase 6: Docs Guides (`scope: diagrams`)

Create numbered guides in `docs/`:

| File | Content |
|------|---------|
| `docs/00-overview.md` | Project goals, team overview, links to all docs |
| `docs/01-architecture.md` | System architecture diagrams, data flow, package dependencies |
| `docs/02-database.md` | Prisma schema reference, ER diagram (Mermaid), service API |
| `docs/03-deployment.md` | Hetzner VPS, Dokploy, Docker, Traefik, SSL |
| `docs/04-development.md` | Local setup, prerequisites, env vars, testing, linting |

Diagram guidelines:
- ASCII for architecture overviews, pipeline flows, component trees
- Mermaid `sequenceDiagram` for OAuth flow, publish pipeline
- Mermaid `erDiagram` for database schema
- Max 5-7 nodes per diagram — split complex ones

### Phase 7: Memory Update (`scope: memory`)

Review memory files at the project memory path:

1. Update `project_structure.md` if feature names have changed
2. Add `project_documentation.md` memory describing where docs live
3. Update `MEMORY.md` index

### Phase 8: Full Run (`scope: all`)

Execute phases 1-7 in priority order:
1. Audit (always first)
2. Present audit to user, ask for confirmation
3. Screenshots (needed for root README)
4. Root README
5. P0 packages and features
6. P1 packages and features
7. Docs guides
8. P2 items
9. Memory update

## Rules

- **Read before writing**: Always read the actual source code before generating docs. Never document hypothetical behavior.
- **Conservative updates**: When updating existing docs, only modify sections with actual discrepancies.
- **No bloat**: Do not add comments, annotations, or explanations beyond what the template requires.
- **Match style**: Follow the formatting from [references/doc-standards.md](references/doc-standards.md) exactly.
- **No speculation**: Do not document planned features or hypothetical changes.
- **sidebar-layout is the template**: All feature docs should match its structure and depth.
