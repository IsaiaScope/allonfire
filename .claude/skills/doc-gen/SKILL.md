---
name: doc-gen
description: >
  Generate and maintain project documentation — README files, CLAUDE.md guides, docs/ architecture guides,
  Playwright screenshots, and ASCII/Mermaid diagrams for the AllOnFire monorepo. Use when asked to
  "generate docs", "create README", "update documentation", "refresh screenshots", "audit docs",
  "document this feature", "add docs", or "doc-gen".
---

# Doc-Gen Skill

Generate and maintain documentation for the AllOnFire monorepo. Read [references/doc-standards.md](references/doc-standards.md) before generating any documentation — it contains all visual rules, templates, and preferences learned from past sessions.

## Prerequisites

- Target app running for screenshot capture: Laura on `:3200`
- Playwright MCP tools available for browser automation
- Read [references/doc-standards.md](references/doc-standards.md) for visual formatting rules
- Read [references/doc-map.md](references/doc-map.md) for the full inventory of documentation targets

## Scope Argument

| Scope | What it does |
|-------|-------------|
| `audit` | Scan and report which docs are missing/stale (default, dry-run) |
| `root` | Generate root README.md |
| `packages` | Generate README.md for each package missing one |
| `features` | Generate README.md + CLAUDE.md for each feature |
| `screenshots` | Capture Playwright screenshots of all app pages |
| `diagrams` | Generate architecture diagrams and docs/ guides |
| `memory` | Update .claude memory files |
| `all` | Execute all phases in priority order |

If no scope is provided, default to `audit`.

## Critical Style Rules

These were learned from user feedback and MUST be followed:

### Structure
1. **`<h1 align="center">`** for all README page titles — NOT `<h3>`, NOT markdown `#`
2. **Exception: root README** uses `<h3>` to avoid GitHub h1 underline
3. **Centered header block** — title + badges + description all in `<p align="center">`
4. **Left-aligned section headings** — standard markdown `##` with emoji prefix
5. **Consistent layout** — every README follows the same header → screenshots → sections pattern

### Badges
6. **Always HTML `<img>` tags** inside `<p align="center">` — NEVER markdown `![]()`
7. **Default `flat` style** — never `flat-square`
8. **Root badges = monorepo stack only** — pnpm, Turborepo, TypeScript, Biome, Node
9. **App/feature/package badges = their specific stack**

### Screenshots
10. **2-column grid** — desktop + mobile side by side in ONE `<p>`, never separate blocks
11. **Feature READMEs**: desktop `600`, mobile `200`
12. **App README gallery**: desktop `550`, mobile `180`
13. **Hide Next.js dev tools** before every screenshot capture (see doc-standards.md for the JS snippet)
14. **Path depth matters** — features are 5 levels deep (`../../../../../docs/screenshots/`)

### Content
15. **No box-drawing characters** — use plain `──>`, `+--`, `|` only
16. **Plain indentation** for directory trees — NOT `├──` and `└──`
17. **Actual Unicode emoji** — 📸 not `:camera_flash:`, 📁 not `:file_folder:`
18. **Brief descriptions** between heading and content
19. **Root README is generic** — describes monorepo, NOT specific apps

### Files & Assets
20. **`.png` for logos** in READMEs (better preview than `.svg`)
21. **`docs/assets/`** for logos/icons copied from app `public/` folders
22. **`/screenshots/`** in gitignore (root-only slash) — NOT `screenshots/` which blocks `docs/screenshots/`
23. **No sensitive infra details** — no machine types, IPs, SSH info
24. **LICENSE (MIT)** at repo root

## Workflow

### Phase 0: Consistency Audit (Regression Detection)

Always run this before any generation. Detects drift between docs and code.

1. **Route drift** — Glob all `page.tsx` files under each app's `app/` directory. Compare against routes listed in the app's README. Flag: added routes not in README, removed routes still in README.

2. **Environment variable drift** — Parse `env.ts` files (app-level + package-level `extends`). Compare against env vars table in README. Flag: new vars not documented, removed vars still listed.

3. **Screenshot path validation** — Parse every `<img src="..."` in all READMEs. Verify the referenced file exists on disk. Flag: broken image references.

4. **Feature directory sync** — List actual feature directories under each app's `src/features/`. Compare against documented features in doc-map. Flag: new features without docs, removed features with stale docs.

5. **Package export audit** — Read each package's `src/index.ts` exports. Compare against API Reference table in package README. Flag: new exports not documented, removed exports still listed.

6. **Badge version check** — Parse `package.json` for each app/package. Compare major versions against badge values in README. Flag: version mismatches (e.g., badge says React 18 but package.json has React 19).

**Output:** Status table with pass/warn/fail for each check, grouped by app/package.

### Phase 1: Audit Existing Documentation

Always run this first, regardless of scope.

1. Scan for all `README.md`, `CLAUDE.md`, and `docs/` directories
2. Compare against [references/doc-map.md](references/doc-map.md)
3. Report a status table
4. If scope is `audit`, stop here

### Phase 2: Screenshots (`scope: screenshots`)

Save to `docs/screenshots/` (NOT `/screenshots/` which is gitignored).

For each page: `browser_resize` → `browser_navigate` → **hide dev tools** (see snippet in doc-standards.md) → `browser_take_screenshot`.

#### Laura App (port 3200)

Desktop (1440x900): laura-gallery, laura-upload, laura-games, laura-memory, laura-quiz, laura-settings.
Mobile (390x844): mobile-laura-gallery, mobile-laura-upload, mobile-laura-games, mobile-laura-memory, mobile-laura-quiz, mobile-laura-settings.

**Laura-specific:** Wait for Framer Motion animations to settle (2s delay) before capture. Laura uses Italian locale by default — screenshots show `/en` routes for English.

### Phase 3: Root README (`scope: root`)

Follow the structure in [references/doc-standards.md](references/doc-standards.md) Section 6 exactly:

1. Logo (centered, 80px) from `docs/assets/`
2. Title as `<h3 align="center">` — no tagline
3. `<br />` spacer
4. Root badges (monorepo stack only)
5. `---` divider
6. About section (1-2 generic sentences about the monorepo)
7. Apps section — each app vertical: logo → title → app-specific badges → description → docs link
8. `---` divider
9. Packages — emoji table with brief description above
10. Project Structure — badges for infra tech + description + plain-indentation folder tree
11. Infrastructure — emoji table with brief description above. No sensitive details.
12. `---` divider
13. Footer — centered casual sign-off

### Phase 4: Package READMEs (`scope: packages`)

Use the template in [references/doc-standards.md](references/doc-standards.md) Section 8.

Read the package's `src/index.ts` to discover the API surface. Read consuming files in `apps/laura/` for usage examples.

### Phase 5: Feature Documentation (`scope: features`)

Use `sidebar-layout/` as the template — read both its README.md and CLAUDE.md, then replicate that structure.

Templates in [references/doc-standards.md](references/doc-standards.md) Sections 9 and 10.

**Important:** Read every file in the feature directory before writing. Document what actually exists.

### Phase 6: Docs Guides (`scope: diagrams`)

Create numbered guides in `docs/`:

| File | Content |
|------|---------|
| `docs/00-overview.md` | Project goals, links to all docs |
| `docs/01-architecture.md` | System architecture diagrams, data flow, package dependencies |
| `docs/02-database.md` | Prisma schema reference, ER diagram (Mermaid), service API |
| `docs/03-deployment.md` | Deployment setup (no sensitive details) |
| `docs/04-development.md` | Local setup, prerequisites, env vars, testing, linting |

### Phase 7: Memory Update (`scope: memory`)

1. Update `project_structure.md` if feature names have changed
2. Add `project_documentation.md` describing where docs live
3. Update `MEMORY.md` index

### Phase 8: Full Run (`scope: all`)

Execute phases 1-7 in priority order. Present audit first, ask for confirmation.

## Rules

- **Read before writing** — always read actual source code before generating docs
- **Conservative updates** — only modify sections with actual discrepancies
- **No bloat** — no extra comments or explanations beyond the template
- **Match style** — follow [references/doc-standards.md](references/doc-standards.md) exactly
- **No speculation** — do not document planned features
- **sidebar-layout is the template** — all feature docs match its structure
