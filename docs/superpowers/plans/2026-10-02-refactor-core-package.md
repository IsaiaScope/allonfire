# Core Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename `@allonfire/utils` to `@allonfire/core`, reorganise it into `environment/`, `shared/` and `features/`, rewrite every importer, and write the package-architecture rules into `CLAUDE.md` and ADR 0016.

**Status:** implemented (uncommitted) @ 2026-10-07T12:30:16Z

**Architecture:** Plan 1 of 7 in the package-architecture roadmap. A move map (old path → new path) drives two scripts: one moves the files and fixes the relative imports inside the package, the other rewrites every `@allonfire/utils/...` specifier in the workspace to its `@allonfire/core/...` twin. No behaviour changes; the existing suites are the guard, and the type check of every Host proves no importer was missed.

**Tech Stack:** pnpm workspaces + turbo, TypeScript 6, Vitest, Python 3 (one-off scripts run from the plan, not committed).

**Spec:** `docs/superpowers/specs/2026-10-02-package-architecture-design.md`

## Global Constraints

- Never commit (iso-write).
- **Prerequisite:** the other session's uncommitted `packages/auth` work (`src/features/next/*`, `src/environment/next-environment.ts`) must be committed first: Task 2 rewrites imports in those files. If it is still uncommitted, halt Task 2 with the blocked marker and ask.
- The top of every `src/` holds only `environment/`, `shared/` and `features/` (plus root entry files).
- Kind folders are a closed list: `components`, `hooks`, `actions`, `middleware`, `routes`, `constants`, `types`, `utils`, `tests`. Any other folder in a feature is a sub-feature.
- Export keys mirror the file path without `src/` and the extension, one line per file.
- No `as` casts; no `biome-ignore`; end with `pnpm biome check --write <touched paths>`.
- exFAT: delete `._*` sidecars after every move (`find <dir> -name '._*' -delete`).
- Laura is out of scope: its `@allonfire/utils` specifiers are rewritten mechanically, nothing else; it is not type-checked.

## Review Focus

1. A relative import inside the moved package that the script failed to remap: `tsc` of `core` must pass (Task 1 Step 5).
2. A `new URL("../…", import.meta.url)` literal (not an import) that now points one level short: `scaffolded-apps.ts` gains a `../` (Task 1 Step 3) and the peer-versions test must still find the Apps (Task 1 Step 5).
3. An importer the specifier script missed (a `tsconfig.json` `paths` entry, a dynamic `import()`, a doc): the final grep must print nothing (Task 2 Step 5).
4. A Next App that stops transpiling the package: `AOFCreateNextConfig`'s base list must name `@allonfire/core` (its test is updated to assert it, Task 1 Step 3).
5. A `._*` sidecar under `packages/core/src` picked up by Vitest or tsc after the move: deleted in Task 1 Step 2.

---

### Task 1: `utils` becomes `core`, reorganised

**Files:**
- Move: `packages/utils/` → `packages/core/` (every file under `src/` per the move map below)
- Modify: `packages/core/package.json` (name, exports, `i18n:check` path), `packages/core/tsconfig.json` (comment), `packages/core/src/features/next/config/aof-create-next-config.ts` (`BASE_TRANSPILE`), its test, `packages/core/src/features/next/tests/scaffolded-apps.ts`, `packages/core/src/features/next/tests/peer-versions.test.ts`

**Interfaces:**
- Produces: package `@allonfire/core` with these export keys (old key → new key), used by Task 2's specifier map:

| Old (`@allonfire/utils/…`) | New (`@allonfire/core/…`) |
|---|---|
| `constants/env` | `shared/constants/env` |
| `constants/node-env` | `shared/constants/node-env` |
| `constants/patterns` | `shared/constants/patterns` |
| `constants/separators` | `shared/constants/separators` |
| `constants/units` | `shared/constants/units` |
| `helpers/object` | `shared/utils/object` |
| `constants/http` | `features/http/constants/http` |
| `constants/security-headers` | `features/http/constants/security-headers` |
| `constants/locales` | `features/i18n/constants/locales` |
| `constants/logger` | `features/logger/constants/logger` |
| `helpers/coded-error` | `features/errors/coded-error` |
| `helpers/error` | `features/errors/format-error-message` |
| `environment/environment` | `environment/environment` |
| `next/<rest>` | `features/next/<rest>` |

- [x] **Step 1: Record the baseline**

Run: `cd packages/utils && pnpm exec vitest run 2>&1 | grep -E "Test Files|Tests " ; pnpm exec tsc --noEmit && echo TSC-OK`
Expected: `Test Files  12 passed`, `Tests  43 passed` (note the exact counts), `TSC-OK`.

- [x] **Step 2: Move the files and fix the relative imports**

Run from the repo root:

```bash
mv packages/utils packages/core && find packages/core -name '._*' -not -path '*/node_modules/*' -delete
python3 - <<'EOF'
import os, re, shutil
SRC = "packages/core/src"
MOVES = {
  "constants/env.ts": "shared/constants/env.ts",
  "constants/node-env.ts": "shared/constants/node-env.ts",
  "constants/patterns.ts": "shared/constants/patterns.ts",
  "constants/separators.ts": "shared/constants/separators.ts",
  "constants/units.ts": "shared/constants/units.ts",
  "helpers/object.ts": "shared/utils/object.ts",
  "constants/http.ts": "features/http/constants/http.ts",
  "constants/security-headers.ts": "features/http/constants/security-headers.ts",
  "constants/tests/http.test.ts": "features/http/tests/http.test.ts",
  "constants/locales.ts": "features/i18n/constants/locales.ts",
  "constants/tests/locales.test-d.ts": "features/i18n/tests/locales.test-d.ts",
  "constants/logger.ts": "features/logger/constants/logger.ts",
  "helpers/coded-error.ts": "features/errors/coded-error.ts",
  "helpers/error.ts": "features/errors/format-error-message.ts",
  "helpers/tests/coded-error.test.ts": "features/errors/tests/coded-error.test.ts",
}
def target(old):
    if old in MOVES: return MOVES[old]
    if old.startswith("next/"): return "features/" + old
    return old
files = [os.path.relpath(os.path.join(d, f), SRC) for d, _, fs in os.walk(SRC) for f in fs if not f.startswith("._")]
new_of = {f: target(f) for f in files}
SPEC = re.compile(r'''((?:from|import)\s*\(?\s*["'])(\.{1,2}/[^"']+)(["'])''')
def resolve(base_old, spec):
    raw = os.path.normpath(os.path.join(os.path.dirname(base_old), spec))
    for cand in (raw, raw + ".ts", raw + ".tsx", raw + "/index.ts"):
        if cand in new_of: return cand, cand[len(raw):]
    raise SystemExit(f"unresolved {spec} in {base_old}")
contents = {f: open(os.path.join(SRC, f)).read() for f in files if f.endswith((".ts", ".tsx"))}
for f, text in contents.items():
    def fix(m):
        old_target, suffix = resolve(f, m.group(2))
        new_target = new_of[old_target]
        rel = os.path.relpath(new_target[: len(new_target) - len(suffix)] if suffix else new_target, os.path.dirname(new_of[f]))
        if not rel.startswith("."): rel = "./" + rel
        return m.group(1) + rel + m.group(3)
    contents[f] = SPEC.sub(fix, text)
for f in files:
    dst = os.path.join(SRC, new_of[f]); os.makedirs(os.path.dirname(dst), exist_ok=True)
    if f in contents:
        open(dst, "w").write(contents[f])
        if dst != os.path.join(SRC, f): os.remove(os.path.join(SRC, f))
    elif new_of[f] != f:
        shutil.move(os.path.join(SRC, f), dst)
for d, _, _ in sorted(os.walk(SRC), reverse=True):
    if not os.listdir(d): os.rmdir(d)
EOF
find packages/core/src -name '._*' -delete; ls packages/core/src
```

Expected: no `unresolved` exit; `ls` prints `environment  features  shared`.

- [x] **Step 3: Fix what the script cannot see**

`packages/core/src/features/next/tests/scaffolded-apps.ts`: the file is one folder deeper, so
`export const REPO = new URL("../../../../../", import.meta.url);` becomes
`export const REPO = new URL("../../../../../../", import.meta.url);`

`packages/core/src/features/next/tests/peer-versions.test.ts`: `new URL("packages/utils/", REPO)` becomes `new URL("packages/core/", REPO)`; rename the local `utils` variable to `core`; in its comments and the `it.each` title replace "utils" with "core".

`packages/core/src/features/next/config/aof-create-next-config.ts`:

```ts
/** core ships TypeScript source, so every App transpiles it. */
const BASE_TRANSPILE = ["@allonfire/core"];
```

and in `Options`, the `transpile` JSDoc reads "added to `@allonfire/core`". In its test (`features/next/config/tests/aof-create-next-config.test.ts`) every `"@allonfire/utils"` becomes `"@allonfire/core"`.

`packages/core/package.json`:
- `"name": "@allonfire/core"`
- `scripts.i18n:check`: `"i18n-check --locales src/features/next/i18n/translations --source en"`
- `exports` rebuilt from the files, one line per non-test source file:

```bash
node -e '
const fs=require("fs"),path=require("path");const p="packages/core/package.json";const j=JSON.parse(fs.readFileSync(p));
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.name.startsWith("._")?[]:e.isDirectory()?(e.name==="tests"?[]:walk(path.join(d,e.name))):[path.join(d,e.name)]);
const files=walk("packages/core/src").filter(f=>/\.tsx?$/.test(f)&&!/\.test(-d)?\.tsx?$/.test(f));
j.exports=Object.fromEntries(files.map(f=>{const rel=path.relative("packages/core",f);return["./"+rel.replace(/^src\//,"").replace(/\.tsx?$/,""),"./"+rel];}).sort(([a],[b])=>a.localeCompare(b)));
fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n");console.log(Object.keys(j.exports).length)'
```

Expected: prints `25`, the same keys as before under their new paths (`scaffolded-apps.ts` is under `tests/` and stays unexported). Any other number: compare against the Interfaces table before going on.

`packages/core/tsconfig.json`: the comment `// src/next/ holds React components` becomes `// src/features/next/ holds React components`.

- [x] **Step 4: Run core's own checks**

No `pnpm install` yet: the other packages still depend on `@allonfire/utils`, which no longer exists, so install fails until Task 2. `packages/core/node_modules` moved with the folder and its links still resolve.

Run: `cd packages/core && pnpm exec tsc --noEmit && pnpm exec vitest run 2>&1 | grep -E "Test Files|Tests "`
Expected: tsc exit 0; the same counts as Step 1.

- [x] **Step 5: Format**

Run: `pnpm biome check --write packages/core`
Expected: exit 0.

---

### Task 2: Every importer reads `@allonfire/core`

**Files:**
- Modify: every file under `apps/` and `packages/` (except `auth-old`, `ui-old`, `node_modules`, `.next`, `dist`) that names `@allonfire/utils`; `packages/*/package.json` and `apps/*/package.json` dependency keys; `apps/api/tsconfig.json`, `packages/auth/tsconfig.json`, `apps/laura/tsconfig.json` (`paths`); `pnpm-lock.yaml` (by `pnpm install`)

**Interfaces:**
- Consumes: the export table from Task 1.

- [x] **Step 1: Watch the workspace fail**

Run: `pnpm turbo run check-types --continue --filter='!@allonfire/laura' 2>&1 | grep -c "Cannot find module '@allonfire/utils"`
Expected: a count above 0 — every importer still names the old package (this is the RED: the rename is visible to the type checker).

- [x] **Step 2: Rewrite the specifiers**

```bash
python3 - <<'EOF'
import os, re
MAP = {
  "constants/env": "shared/constants/env",
  "constants/node-env": "shared/constants/node-env",
  "constants/patterns": "shared/constants/patterns",
  "constants/separators": "shared/constants/separators",
  "constants/units": "shared/constants/units",
  "helpers/object": "shared/utils/object",
  "constants/http": "features/http/constants/http",
  "constants/security-headers": "features/http/constants/security-headers",
  "constants/locales": "features/i18n/constants/locales",
  "constants/logger": "features/logger/constants/logger",
  "helpers/coded-error": "features/errors/coded-error",
  "helpers/error": "features/errors/format-error-message",
  "environment/environment": "environment/environment",
  # Laura's legacy keys, rewritten so they stay mapped
  "object": "shared/utils/object",
  "security-headers": "features/http/constants/security-headers",
  "environment": "environment/environment",
}
SPEC = re.compile(r'@allonfire/utils(/[A-Za-z0-9/._-]+)?')
def new(m):
    rest = (m.group(1) or "")[1:]
    if not rest: return "@allonfire/core"
    if rest.startswith("next/"): return "@allonfire/core/features/" + rest
    if rest not in MAP: raise SystemExit(f"unmapped @allonfire/utils/{rest}")
    return "@allonfire/core/" + MAP[rest]
SKIP = {"node_modules", ".next", ".turbo", "dist", "auth-old", "ui-old", "generated"}
for root in ("apps", "packages"):
    for d, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x not in SKIP]
        for f in files:
            if f.startswith("._") or not f.endswith((".ts", ".tsx", ".mts", ".json", ".css")): continue
            p = os.path.join(d, f); s = open(p).read()
            if "@allonfire/utils" not in s: continue
            t = SPEC.sub(new, s.replace('"@allonfire/utils/*"', '"@allonfire/core/*"'))
            t = t.replace('"../utils/src/*"', '"../core/src/*"').replace('"../../packages/utils/src/*"', '"../../packages/core/src/*"')
            open(p, "w").write(t); print(p)
EOF
```

Expected: a list of files, no `unmapped` exit. Markdown is left to Task 3, where prose needs a reader, not a regex. The `tsconfig.json` `paths` entries now read `"@allonfire/core/*": [".../core/src/*"]`.

- [x] **Step 3: Re-sort the dependency blocks and install**

```bash
for p in packages/*/package.json apps/*/package.json; do node -e '
const fs=require("fs");const p=process.argv[1];const j=JSON.parse(fs.readFileSync(p));
for(const k of ["dependencies","devDependencies","peerDependencies"]) if(j[k]) j[k]=Object.fromEntries(Object.entries(j[k]).sort(([a],[b])=>a.localeCompare(b)));
fs.writeFileSync(p,JSON.stringify(j,null,2)+"\n")' "$p"; done
pnpm install
```

Expected: exit 0; `pnpm-lock.yaml` names `@allonfire/core`, not `@allonfire/utils`.

- [x] **Step 4: Type-check and test the workspace**

Run: `pnpm turbo run check-types --continue --filter='!@allonfire/laura'; pnpm turbo run test --continue --filter='!@allonfire/laura'`
Expected: every task passes. The only failures allowed are ones that also failed before this plan in `@allonfire/auth`'s own unfinished files (name them in the ledger); none may mention `@allonfire/utils` or `@allonfire/core`.

- [x] **Step 5: Prove nothing names the old package**

Run: `grep -rn "@allonfire/utils\|packages/utils" apps packages turbo.json biome.jsonc docker .github package.json --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=auth-old --exclude-dir=ui-old --exclude-dir=dist --exclude='*.md'`
Expected: no output (Markdown is Task 3's).

- [x] **Step 6: Format**

Run: `pnpm biome check --write $(git diff --name-only -- apps packages | grep -E '\.(ts|tsx|json)$' | grep -v '^apps/laura/')`
Expected: exit 0.

---

### Task 3: The rules, written down

**Files:**
- Create: `docs/adr/0016-packages-are-concepts-with-adapter-folders.md`
- Modify: `CLAUDE.md`, `README.md`, `packages/core/README.md`, `docs/adr/0012-next-scaffolding-lives-in-utils.md` (one status line), `.claude/skills/aof-documentation/references/doc-map.md`, `apps/laura/src/features/games/CLAUDE.md` (one table row)

No test: documentation.

- [x] **Step 1: ADR 0016**

`docs/adr/0016-packages-are-concepts-with-adapter-folders.md`:

```markdown
# Packages are concepts with adapter folders

Every package names one concept (`core`, `auth`, `database`, `storage`,
`image`, `ui`) and works for any Host: two backends, two frontends, or one of
each. When a concept needs a framework, the adapter lives in a sub-folder
(`features/next/`, `features/hono/`) and the framework is an optional peer, so
a Host on another framework installs the package and never loads that code.
A package or folder carries an App, vendor or framework name only when it is
wholly that thing (`shadcn`, `features/next`, `database/apps/laura`). Inside a
package, `src/` holds only `environment/`, `shared/` and `features/`; features
nest directly, and any folder that is not a kind folder (`components`, `hooks`,
`actions`, `middleware`, `routes`, `constants`, `types`, `utils`, `tests`) is a
sub-feature. Code lives in the deepest feature that contains every reader.

## Considered Options

- **One package per adapter** (`auth-hono`, `auth-next`): three times the
  packages for what per-file exports already give.
- **Framework code in its own package** (`next`): the Next scaffolding would
  leave `core` for a package that only re-exports Next wiring; kept in
  `core/features/next` instead.
- **An explicit `features/` folder at every level:** unambiguous, but every
  path one folder deeper.

## Consequences

- `utils` is now `core`; ADR 0012's scaffolding lives in `core/features/next`.
- Every export path is longer (`@allonfire/core/features/http/constants/http`),
  and says where the file lives.
- The remaining plans (storage/image split, API layout, database apps, auth by
  adapter, one source of truth, languages) follow this ADR.
```

- [x] **Step 2: ADR 0012 status**

Append to `docs/adr/0012-next-scaffolding-lives-in-utils.md`:

```markdown

## Status

Location updated by ADR 0016: `utils` is now `core`, and the scaffolding lives
in `packages/core/src/features/next/`.
```

- [x] **Step 3: CLAUDE.md**

In `## Package Layout (every Node package and apps/api)`, replace the code block and the paragraph after it ("Every folder is optional. … (plus `types/` if it ever holds types alone).") with:

````markdown
```
src/
  index.ts            root entry only (an App's boot file, a package's root export)
  environment/        the zod env schema, validated at import
  shared/             what more than one top-level feature reads, by kind
  features/
    <feature>/
      <kind>/         components, hooks, actions, middleware, routes,
                      constants, types, utils, tests
      <sub-feature>/  any folder that is not a kind; same shape, recursively
```

Only `environment/`, `shared/` and `features/` sit at the top of `src/`; routes
live in their feature (`features/<name>/routes/`). Kind folders are the closed
list above; any other folder inside a feature is a sub-feature. Nest only when
a feature really has sub-features. Code lives in the deepest feature that
contains every reader: one sub-feature reads it, it lives there; two
sub-features, their parent's kind folder; two top-level features, `shared/`.
A feature's main file may sit directly in its folder when a kind folder would
hold only that file. Every folder is optional (ADR 0016).

**Packages are concepts.** One package per concept, usable by any Host (an App
or the API, see `CONTEXT.md`). A framework adapter lives in a sub-folder
(`features/next/`, `features/hono/`) with the framework as an optional peer. A
package or folder is named after an App, vendor or framework only when it is
wholly that thing (`shadcn`, `features/next`, `database/apps/laura`). A
package's logic never names an App; packages that catalogue per App
(`database`, `design`) keep App folders.
````

Then, everywhere in `CLAUDE.md`:
- `packages/utils` → `packages/core`, "`utils`" (the package) → "`core`".
- In the paragraph "Anything not API-specific — `HTTP_STATUS`, … — lives in `@allonfire/utils/constants/*`", replace `@allonfire/utils/constants/*` with `` `@allonfire/core` (`features/http`, `features/logger`, `shared/constants`) ``.
- `## Object Helpers (`@allonfire/utils/helpers/object`)` → `## Object Helpers (`@allonfire/core/shared/utils/object`)`.
- `` `@allonfire/utils/next/providers/*` `` → `` `@allonfire/core/features/next/providers/*` ``.
- `` `@allonfire/utils/constants/locales` `` → `` `@allonfire/core/features/i18n/constants/locales` ``; `src/constants/tests/locales.test-d.ts` → `src/features/i18n/tests/locales.test-d.ts`.
- `` `@allonfire/utils/helpers/coded-error` `` → `` `@allonfire/core/features/errors/coded-error` ``.
- The sentence "A package with no features needs no `shared/` either: `packages/utils` is `environment/`, `constants/`, `helpers/` and `next/`, the App scaffolding by topic (`config/`, `i18n/`, `query/`, `providers/`; ADR 0012)" is deleted (the new paragraph replaces it).

- [x] **Step 4: READMEs and indexes**

- `packages/core/README.md`: title `@allonfire/core`; every `@allonfire/utils/…` path through the Task 1 table; the intro says it holds the framework-free constants and helpers every Host shares, plus the Next scaffolding in `features/next` (ADR 0012, ADR 0016).
- `README.md` (root): the packages table row becomes `| 🔧 | **[@allonfire/core](packages/core/)** | Shared constants, helpers and the Next scaffolding |`; the tree line `utils/                Utility functions` becomes `core/                 Shared constants, helpers, Next scaffolding`.
- `.claude/skills/aof-documentation/references/doc-map.md`: the `packages/utils/README.md` row becomes `packages/core/README.md`, described as "Shared constants, helpers, Next scaffolding".
- `apps/laura/src/features/games/CLAUDE.md:115`: `` `@allonfire/utils` `` → `` `@allonfire/core` ``.
- `packages/auth/README.md`, `packages/storage/README.md`: any `@allonfire/utils` mention through the Task 1 table.

- [x] **Step 5: Verify**

Run: `grep -rn "@allonfire/utils\|packages/utils" CLAUDE.md README.md packages/*/README.md .claude/skills docs/adr`
Expected: only ADR 0012's title line and its file name (history), nothing else.

## Implementation Log
- Implemented: 2026-10-07T12:30:16Z
- Workspace: current-branch — feat/design-package
- Committed: no — awaiting user review
- Rulings:
  - Task 2: `--filter='!@allonfire/laura'` dropped: Laura is not a workspace member (`pnpm-workspace.yaml` excludes it), and turbo refuses an unknown filter.
  - Task 2: integration tests (5 files, Postgres/Redis) not verified — the Docker daemon was down; every unit suite passed and check-types is 10/10.
  - Task 2: the old-name grep runs as `git grep --untracked` so generated files (`*.tsbuildinfo`, `coverage/`, Laura's `.next-mobile/`, `.turbo` logs) do not count.
  - Task 3: ADR 0015 also points at the new `CodedError` path (a live reference); ADR 0012's body keeps the old name as history, under its new Status note.
  - Open for plan 7: `features/next/i18n/translations/` is a data folder, not in the kind list; decide there whether `translations` joins the list.
  - Follow-up (user): `shared/constants/node-env` merged into `shared/constants/env` (`BOOLEAN_ENV` and `NODE_ENV` in one file); its export key removed, importers rewritten.
