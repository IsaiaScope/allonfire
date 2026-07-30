# Documentation Standards

Visual, structural, and content standards for all documentation in the AllOnFire monorepo. These rules were refined through hands-on documentation sessions and reflect the user's actual preferences.

## 1. File Hierarchy

| Level | Files | Purpose |
|-------|-------|---------|
| **Root** | `README.md` | Monorepo overview — generic, badges, apps list, packages, structure |
| **Root** | `CLAUDE.md`, `.claude/CLAUDE.md` | AI assistant coding rules and conventions |
| **Package/App** | `{package}/README.md` | Package API reference, setup, usage examples |
| **Feature** | `features/{name}/README.md` | Feature overview, component hierarchy, data flow |
| **Feature** | `features/{name}/CLAUDE.md` | AI-oriented modification guide, gotchas, dependencies |
| **Guides** | `docs/{nn}-{topic}.md` | Progressive numbered guides (overview, architecture, database, deployment, dev) |

### Documentation Assets

- `docs/assets/` — logos, icons, shared images (copy from app `public/` folders)
- `docs/screenshots/` — committed screenshots for READMEs (tracked by git)
- `/screenshots/` — gitignored, for ad-hoc dev/debug screenshots only

**Important:** `.gitignore` must use `/screenshots/` (root-only) not `screenshots/` which would also ignore `docs/screenshots/`.

## 2. Consistent README Structure

**Every README** (package, feature, app) follows this exact structure:

```html
<!-- HEADER BLOCK — all centered -->
<h1 align="center">Title</h1>

<p align="center">
  <img src="badge1" /> <img src="badge2" /> ...
</p>

<p align="center">Brief description of what this is.</p>

---

<!-- SCREENSHOTS — desktop + mobile side by side -->
<p align="center">
  <img src="path/to/desktop.png" width="600" alt="Desktop view" />
  &nbsp;&nbsp;
  <img src="path/to/mobile.png" width="200" alt="Mobile view" />
</p>

<!-- CONTENT SECTIONS — left-aligned markdown with emoji headings -->
## 📁 Directory Structure
## 📦 API Reference
## 🔧 Usage
...
```

### Key Rules

- **`<h1 align="center">`** for all page titles (NOT `<h3>`, NOT markdown `#`)
- **Exception:** Root README uses `<h3>` to avoid the GitHub h1/h2 underline
- **Badges always as `<img>` HTML** inside `<p align="center">` — never markdown `![]()`
- **Description always in `<p align="center">`** — never raw paragraph text
- **Section headings** (`##`) are left-aligned standard markdown with emoji prefix
- **No emoji shortcodes** — use actual Unicode emoji (📸 not `:camera_flash:`, 📁 not `:file_folder:`)
- **`---` divider** between header block and content sections

## 3. Screenshot Layout

Screenshots always appear as a **2-column grid** — desktop on left, mobile on right, in a single centered `<p>`:

```html
<p align="center">
  <img src="..." width="600" alt="Desktop" />
  &nbsp;&nbsp;
  <img src="..." width="200" alt="Mobile" />
</p>
```

**Never** put desktop and mobile in separate `<p>` blocks — they must be side by side.

### Dimension Standards (in pixels)

| Context | Desktop | Mobile |
|---------|---------|--------|
| **Feature READMEs** | `600` | `200` |
| **App README gallery** | `550` | `180` |
| **Admin pair (2 desktop)** | `380` | `380` |

### Relative Paths

From feature READMEs at `apps/{app}/src/features/{name}/`:
```
../../../../../docs/screenshots/{image}.png    (5 levels up to repo root)
```

From app README at `apps/{app}/`:
```
../../docs/screenshots/{image}.png             (2 levels up to repo root)
```

**Count carefully** — wrong path depth is the #1 cause of broken images.

### Laura-Specific Conventions

- **Screenshot naming**: `laura-{page}.png` / `mobile-laura-{page}.png`. The
  `laura-` prefix is retained deliberately: unprefixed screenshots belonged to
  the removed social app, so the prefix marks an asset as live. An unprefixed
  PNG in `docs/screenshots/` is legacy and should be deleted, not reused.
- **Port**: Laura runs on `:3200`
- **Animations**: Wait 2 seconds after navigation for Framer Motion animations to settle
- **i18n**: Laura uses next-intl with `it` (Italian) as default locale. Screenshots use `/en` routes for English.

### Capture Process

1. Ensure app is running: `pnpm dev` (port 3200)
2. **Hide Next.js dev tools** before every screenshot:
   ```js
   // Run via browser_evaluate after each page navigation
   document.querySelectorAll('button').forEach(b => {
     if ((b.textContent||'').includes('Next.js Dev Tools') ||
         (b.textContent||'').includes('Issue') ||
         (b.textContent||'').includes('Rendering')) {
       let p = b;
       while (p && p !== document.body) {
         if (getComputedStyle(p).position === 'fixed') {
           p.style.display = 'none'; break;
         }
         p = p.parentElement;
       }
       b.style.display = 'none';
     }
   });
   document.querySelectorAll('[role="alert"]').forEach(e => e.style.display = 'none');
   ```
3. Use Playwright MCP: `browser_resize` → `browser_navigate` → hide dev tools → `browser_take_screenshot`

### Resolutions

| Type | Width | Height |
|------|-------|--------|
| Desktop | 1440 | 900 |
| Mobile | 390 | 844 |

### File Naming

```
docs/screenshots/laura-{page-name}.png          — Default state
docs/screenshots/laura-{page-name}-{state}.png  — Specific state
docs/screenshots/mobile-laura-{page-name}.png   — Mobile viewport
```

## 4. Badges

### Style

Always `flat` style (dark left label + colored right value). Never `flat-square`.

```
https://img.shields.io/badge/{label}-{value}-{color}?logo={logo}&logoColor=white
```

### Badge Placement Rules

| Location | What badges show |
|----------|-----------------|
| **Root README** | Monorepo tooling only: pnpm, Turborepo, TypeScript, Biome, Node |
| **Root README app section** | App-specific stack: Next.js, React, Prisma, Tailwind, etc. |
| **App README** | Same as app section in root |
| **Feature README** | Feature-specific libraries: dnd-kit, TanStack Query, Framer Motion, etc. |
| **Package README** | Package-specific tech: Prisma, Sharp, Twitter API, etc. |
| **Project Structure section** | Infra tech: Docker, PostgreSQL, n8n, GitHub Actions, Husky |

### Always use HTML `<img>`, never markdown `![]()`

```html
<!-- Correct -->
<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
</p>

<!-- Wrong — never use this -->
![React](https://img.shields.io/badge/React-19-61DAFB)
```

## 5. Emoji Usage

### Section Headings — actual Unicode only

```markdown
## 📁 Directory Structure
## 📦 API Reference
## 📸 Screenshots
## 🔧 Usage
## 🏗️ Infrastructure
```

**Never** use GitHub shortcodes like `:camera_flash:` or `:file_folder:` — they don't render in all contexts.

### Table Row Icons

Each row in packages/infrastructure tables gets an emoji:

```markdown
| 🗄️ | **@allonfire/database** | ... |
| 🎨 | **@allonfire/ui** | ... |
```

## 6. Diagram Standards

### No Box-Drawing Characters

**NEVER** use `┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼`. They misalign across editors.

Use plain `──>`, `+--`, `|` only.

### Directory Trees — plain indentation

```
allonfire/
  apps/
    laura/                Next.js photo gallery + games app
  packages/
    database/             Prisma ORM + services
```

NOT `├──` and `└──`.

### Core Rules

1. Max 5-7 nodes per diagram
2. One diagram per flow
3. Full descriptive labels, no abbreviations
4. Plain characters only

## 7. Root README Structure

The root README is a **generic monorepo overview** that grows over time.

### Sections (in order)

1. **Logo** — centered, ~80px, `.png` format (not `.svg` — better preview compatibility)
2. **Title** — `<h3 align="center">` (h3 to avoid GitHub underline on root only)
3. **Spacer** — `<br />`
4. **Root badges** — monorepo stack only, centered
5. **Divider** — `---`
6. **About** — 1-2 generic sentences about the monorepo
7. **Apps** — each app: centered logo (~200px) → centered `<h3>` subtitle → centered badges → centered description → centered link
8. **Divider** — `---`
9. **Packages** — brief description + emoji table
10. **Project Structure** — infra badges + description + plain-indentation folder tree
11. **Infrastructure** — brief description + emoji table. No sensitive details.
12. **Divider** — `---`
13. **Footer** — centered casual sign-off

### What NOT to include

- Quick Start / Scripts tables (put in app README)
- n8n-specific sections (put in n8n/README.md)
- Tagline under the title
- Detailed route maps (put in app README)
- Sensitive details (machine types, IPs, SSH info)

## 8. Package/Feature README Template

```html
<h1 align="center">Title</h1>

<p align="center">
  <img src="badge" /> ...
</p>

<p align="center">Brief description.</p>

---

<p align="center">
  <img src="desktop.png" width="600" alt="Desktop" />
  &nbsp;&nbsp;
  <img src="mobile.png" width="200" alt="Mobile" />
</p>

## 📁 Directory Structure

[Plain indentation tree]

## 📦 API Reference (packages) / Key Files (features)

[Table]

## 🔧 Usage / Data Flow

[Examples or descriptions]

## 📦 Dependencies

[Table: Package | Why]
```

## 9. Feature CLAUDE.md Template

Follow `sidebar-layout/CLAUDE.md`:

1. **Feature Scope** — "Owns:" and "Does not own:"
2. **File Responsibilities** table
3. **Modification Guide** — numbered steps
4. **Gotchas** — bullet points
5. **Dependencies** table

## 10. Image Format Rules

- Use `.png` for logos in READMEs (better preview compatibility than `.svg`)
- Store in `docs/assets/` — copy from app `public/` folders
- Always include `width` and `alt` attributes
- Use HTML `<img>` tags, never markdown `![]()`

## 11. Markdown Best Practices

- Trailing newline at end of file
- Blank line before/after headings, code blocks, and HTML blocks
- No trailing whitespace
- No duplicate headings at same level
- Alt text on all images
- When using `sed` or find-and-replace on READMEs, be careful not to modify content inside code blocks (e.g., JSX examples containing `<h3>` tags)

## 12. General Principles

- **Consistent structure** — every README follows the same header pattern
- **Keep it lightweight** — root README is a navigation hub, not a manual
- **Brief descriptions** — 1 sentence between section heading and content
- **Grow over time** — start minimal, add as the project evolves
- **No sensitive details** — never include machine types, IPs, SSH credentials
- **Footer** — always end with a centered casual sign-off
- **LICENSE** — MIT at repo root
