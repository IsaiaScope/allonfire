# Design Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `packages/design` the one place every App's interface is designed with impeccable: shared Designs (Japan first), per-App Screens and product context, all impeccable state, reached only through a new `aof-design` skill; rename `doc-gen` to `aof-documentation`.

**Status:** implemented (uncommitted) @ 2026-09-30T09:21:18Z

**Architecture:** impeccable v4 is installed per project. It keeps `.impeccable/` at the project root of the file it edits, so every impeccable call targets a file in `packages/design` and reads its context from `packages/design/src/apps/<app>/` through `IMPECCABLE_CONTEXT_DIR`. A Design's source lives in `src/designs/<name>/`; `design:sync` copies its `DESIGN.md`/`DESIGN.json` into each App folder that wears it and back. Apps import one stylesheet and their Screens; pages route, fetch and translate.

**Tech Stack:** impeccable 4.1 (Claude Code skill + hooks), Node `fs`/`util.parseArgs` via `tsx`, Vitest 4 (globals), React 19 Server Components, Next 16, Tailwind v4, Biome/Ultracite.

**Spec:** `docs/superpowers/specs/2026-09-30-design-package-design.md` (also ADR 0011, CONTEXT.md **Design**/**Screen**)

## Global Constraints

- Never commit. Leave every change in the working tree; the user commits with `/iso-commit`.
- Never add a `biome-ignore` comment; fix the code instead. Finish each task with `pnpm exec biome check --write <files touched in the task>`, never repo-wide.
- No `as` casts, in tests too: narrow, zod-parse, `as const satisfies`, generics.
- Every Vitest file's first line is `// @module-tag unit` (or `integration`); Vitest runs with globals, so no `from "vitest"` import.
- Never call `Object.keys/values/entries/fromEntries`; use `@allonfire/utils/helpers/object` if needed.
- New npm dependencies need ≥200k weekly downloads. This plan adds none beyond existing workspace versions (`tsx ^4.19.0`, `vitest ^4.1.11`, `typescript ~6.0.3`, `react ^19.3.0`).
- `@allonfire/shadcn` is imported only in `packages/ui` (existing Biome rule). Apps may import `@allonfire/ui`.
- `packages/shadcn` is never edited by hand. A missing primitive: `npx shadcn@4.21.0 add <name>` from `apps/back-office`, then `pnpm --filter @allonfire/shadcn canonicalize`.
- Screens take copy as a typed `copy` prop and App elements as `ReactNode` slots; never import next-intl or the App.
- The repo is on exFAT: ignore `._*` files in any directory scan.
- Laura is out of scope and stays paused.

## Review Focus

- impeccable rewrites an App's `DESIGN.md` from scratch and drops the generated header: `--from` must still copy it back whole (test in Task 2).
- exFAT `._PRODUCT.md` / `._DESIGN.md` sidecars at the repo root must not trip the shadowing guard (test in Task 2).
- An App folder with no `styles.css` (half-created by `new`) must be skipped, not crash the sync (test in Task 2).
- `--check` and `--from` passed together must be refused, never half-applied (test in Task 2).
- `--from` naming an App folder that does not exist must say so, not write into a new folder (test in Task 2).

---

### Task 1: Install impeccable v4 per project

**Files:**
- Create: `.claude/skills/impeccable/**` (written by the installer)
- Create: `.claude/settings.json` (impeccable's hooks, tracked)
- Modify: `.claude/settings.local.json` (installer writes hooks here; they move out)

**Interfaces:**
- Produces: `.claude/skills/impeccable/scripts/impeccable` launcher; the `impeccable` skill at v4.1.x; hooks in `.claude/settings.json`.

- [x] **Step 1: Run the installer**

Run from the repo root:

```bash
npx -y impeccable@latest install --providers=claude --scope=project -y
```

Expected: `Installed impeccable into: .claude (project)` and `Installed hooks into: .claude/settings.local.json`.

- [x] **Step 2: Move the hooks into the tracked settings file**

`.claude/*.local.json` is gitignored, so the hooks would not travel. Move only the impeccable entries:

```bash
python3 - <<'EOF'
import json, pathlib
local = pathlib.Path(".claude/settings.local.json")
shared = pathlib.Path(".claude/settings.json")
data = json.loads(local.read_text())
marker = "skills/impeccable/scripts/"
moved = {}
for event, groups in list(data.get("hooks", {}).items()):
    keep = [g for g in groups if marker not in json.dumps(g)]
    take = [g for g in groups if marker in json.dumps(g)]
    if take:
        moved[event] = take
    if keep:
        data["hooks"][event] = keep
    else:
        del data["hooks"][event]
if not data.get("hooks"):
    data.pop("hooks", None)
out = json.loads(shared.read_text()) if shared.exists() else {}
out.setdefault("hooks", {}).update(moved)
shared.write_text(json.dumps(out, indent=2) + "\n")
local.write_text(json.dumps(data, indent=2) + "\n")
print(sorted(moved))
EOF
```

Expected: prints the moved events (for example `['PostToolUse', 'SessionStart', 'Stop']`).

- [x] **Step 3: Verify the version and launcher**

Run: `grep '^version:' .claude/skills/impeccable/SKILL.md && .claude/skills/impeccable/scripts/impeccable --version`
Expected: `version: 4.1.x` and a matching version line.

- [x] **Step 4: Uninstall the user-level 3.1.1 plugin**

Run: `claude plugin uninstall impeccable@impeccable`
Expected: the plugin is removed; `claude plugin list | grep -i impeccable` prints nothing. This touches user config outside the repo: tell the user in the task report.

- [x] **Step 5: Format**

Run: `pnpm exec biome check --write .claude/settings.json`
Expected: no errors (the skill folder is vendor code; leave it as installed).

---

### Task 2: `design:sync` core

**Files:**
- Create: `packages/design/package.json`
- Create: `packages/design/tsconfig.json`
- Create: `packages/design/vitest.config.ts`
- Create: `packages/design/scripts/sync-core.ts`
- Test: `packages/design/scripts/tests/sync.test.ts`

**Interfaces:**
- Produces: `syncDesigns(root: string, options?: SyncOptions): SyncResult`, `wornDesigns(root: string): Map<string, string>`, `type SyncOptions = { check?: boolean; from?: string }`, `type SyncResult = { changed: string[] }` (repo-relative paths, forward slashes).

- [x] **Step 1: Scaffold the package**

`packages/design/package.json`:

```json
{
  "name": "@allonfire/design",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {},
  "scripts": {
    "check-types": "tsc --noEmit",
    "design:sync": "tsx scripts/sync.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@allonfire/ui": "workspace:*"
  },
  "devDependencies": {
    "@allonfire/config": "workspace:*",
    "@types/node": "^22.13.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "tsx": "^4.19.0",
    "typescript": "~6.0.3",
    "vitest": "^4.1.11"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

`packages/design/tsconfig.json`:

```json
{
  "extends": "../config/typescript/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    // Screens import AOF components, which import shadcn's .tsx source, so
    // TypeScript checks it under this config too: the two strict flags the
    // generated code breaks are off here as in packages/ui (ADR 0010).
    "exactOptionalPropertyTypes": false,
    "noUnusedLocals": false,
    "lib": ["dom", "dom.iterable", "ES2022"],
    "types": ["node", "vitest/globals"]
  },
  "include": ["src", "scripts", "vitest.config.ts"]
}
```

`packages/design/vitest.config.ts`:

```ts
import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig } from "vitest/config";

// The sync script's tests and the Screens' render tests both match the
// shared defaults.
export default defineConfig(vitestConfig);
```

Run: `pnpm install`
Expected: `@allonfire/design` joins the workspace; lockfile updated.

- [x] **Step 2: Write the failing tests**

`packages/design/scripts/tests/sync.test.ts`:

```ts
// @module-tag unit
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { syncDesigns, wornDesigns } from "../sync-core";

const APPS = "packages/design/src/apps";
const DESIGNS = "packages/design/src/designs";
const header = (design: string) =>
  `<!-- Generated from src/designs/${design}/DESIGN.md by design:sync. Edit through /aof-design. -->\n`;

let root = "";

const write = (path: string, content: string) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
};
const read = (path: string) => readFileSync(join(root, path), "utf8");
const exists = (path: string) => existsSync(join(root, path));

const design = (name: string, json: string | null = '{"ramp":1}\n') => {
  write(`${DESIGNS}/${name}/DESIGN.md`, `# ${name}\n`);
  write(`${DESIGNS}/${name}/theme.css`, ":root {}\n");
  if (json !== null) {
    write(`${DESIGNS}/${name}/DESIGN.json`, json);
  }
};
const wear = (app: string, name: string) =>
  write(
    `${APPS}/${app}/styles.css`,
    `@import "@allonfire/ui/styles/base.css";\n@import "../../designs/${name}/theme.css";\n@source "./screens";\n`
  );

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "design-sync-"));
});
afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("wornDesigns", () => {
  it("maps an App to the Design its styles.css imports", () => {
    design("japan");
    wear("back-office", "japan");
    expect(wornDesigns(root)).toEqual(new Map([["back-office", "japan"]]));
  });

  it("skips an App with no Design import or no styles.css", () => {
    design("japan");
    write(`${APPS}/plain/styles.css`, '@import "@allonfire/ui/styles/base.css";\n');
    mkdirSync(join(root, APPS, "half-made"), { recursive: true });
    expect(wornDesigns(root).size).toBe(0);
  });

  it("throws on an unknown Design, naming App and Design", () => {
    wear("back-office", "kyoto");
    expect(() => wornDesigns(root)).toThrow(/back-office.*kyoto/);
  });
});

describe("syncDesigns", () => {
  it("writes the header plus DESIGN.md and copies DESIGN.json", () => {
    design("japan");
    wear("back-office", "japan");
    const { changed } = syncDesigns(root);
    expect(read(`${APPS}/back-office/DESIGN.md`)).toBe(`${header("japan")}# japan\n`);
    expect(read(`${APPS}/back-office/DESIGN.json`)).toBe('{"ramp":1}\n');
    expect(changed).toEqual([
      `${APPS}/back-office/DESIGN.md`,
      `${APPS}/back-office/DESIGN.json`,
    ]);
  });

  it("removes the App's DESIGN.json when the Design has none", () => {
    design("japan", null);
    wear("back-office", "japan");
    write(`${APPS}/back-office/DESIGN.json`, "{}\n");
    syncDesigns(root);
    expect(exists(`${APPS}/back-office/DESIGN.json`)).toBe(false);
  });

  it("--check writes nothing and lists stale, missing and superfluous copies", () => {
    design("japan", null);
    wear("back-office", "japan");
    write(`${APPS}/back-office/DESIGN.md`, "stale\n");
    write(`${APPS}/back-office/DESIGN.json`, "{}\n");
    wear("laura", "japan");
    const { changed } = syncDesigns(root, { check: true });
    expect(changed).toEqual([
      `${APPS}/back-office/DESIGN.md`,
      `${APPS}/back-office/DESIGN.json`,
      `${APPS}/laura/DESIGN.md`,
    ]);
    expect(read(`${APPS}/back-office/DESIGN.md`)).toBe("stale\n");
    expect(exists(`${APPS}/laura/DESIGN.md`)).toBe(false);
  });

  it("--check reports nothing once in sync", () => {
    design("japan");
    wear("back-office", "japan");
    syncDesigns(root);
    expect(syncDesigns(root, { check: true }).changed).toEqual([]);
  });

  it("--from strips the header and fans out to every App wearing the Design", () => {
    design("japan");
    wear("back-office", "japan");
    wear("laura", "japan");
    syncDesigns(root);
    write(`${APPS}/back-office/DESIGN.md`, `${header("japan")}# japan v2\n`);
    write(`${APPS}/back-office/DESIGN.json`, '{"ramp":2}\n');
    syncDesigns(root, { from: "back-office" });
    expect(read(`${DESIGNS}/japan/DESIGN.md`)).toBe("# japan v2\n");
    expect(read(`${DESIGNS}/japan/DESIGN.json`)).toBe('{"ramp":2}\n');
    expect(read(`${APPS}/laura/DESIGN.md`)).toBe(`${header("japan")}# japan v2\n`);
    expect(read(`${APPS}/laura/DESIGN.json`)).toBe('{"ramp":2}\n');
  });

  it("--from copies back a DESIGN.md impeccable rewrote without the header", () => {
    design("japan");
    wear("back-office", "japan");
    write(`${APPS}/back-office/DESIGN.md`, "# rewritten\n");
    syncDesigns(root, { from: "back-office" });
    expect(read(`${DESIGNS}/japan/DESIGN.md`)).toBe("# rewritten\n");
    expect(read(`${APPS}/back-office/DESIGN.md`)).toBe(`${header("japan")}# rewritten\n`);
  });

  it("--from refuses an App that wears no Design or does not exist", () => {
    design("japan");
    write(`${APPS}/plain/styles.css`, "\n");
    expect(() => syncDesigns(root, { from: "plain" })).toThrow(/plain/);
    expect(() => syncDesigns(root, { from: "ghost" })).toThrow(/ghost/);
    expect(exists(`${APPS}/ghost`)).toBe(false);
  });

  it("refuses --check and --from together", () => {
    design("japan");
    wear("back-office", "japan");
    expect(() => syncDesigns(root, { check: true, from: "back-office" })).toThrow(
      /--check.*--from/
    );
  });

  it.each([
    "PRODUCT.md",
    "design.md",
    "docs/DESIGN.md",
    ".agents/context/PRODUCT.md",
    "packages/design/DESIGN.md",
    "packages/design/.impeccable/design.json",
  ])("refuses to run while %s shadows the App context", (path) => {
    design("japan");
    wear("back-office", "japan");
    write(path, "x\n");
    expect(() => syncDesigns(root)).toThrow(path);
  });

  it("ignores exFAT ._ sidecars when guarding", () => {
    design("japan");
    wear("back-office", "japan");
    write("._PRODUCT.md", "x\n");
    write("docs/._DESIGN.md", "x\n");
    expect(() => syncDesigns(root)).not.toThrow();
  });
});
```

- [x] **Step 3: Run the tests to verify they fail**

Run: `pnpm --filter @allonfire/design test`
Expected: FAIL, `Failed to resolve import "../sync-core"`.

- [x] **Step 4: Implement `sync-core.ts`**

`packages/design/scripts/sync-core.ts`:

```ts
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const DESIGN_PACKAGE = "packages/design";
const APPS_DIR = `${DESIGN_PACKAGE}/src/apps`;
const DESIGNS_DIR = `${DESIGN_PACKAGE}/src/designs`;
const DESIGN_MD = "DESIGN.md";
const DESIGN_JSON = "DESIGN.json";
const DESIGN_IMPORT = /@import\s+"\.\.\/\.\.\/designs\/([^/"]+)\/theme\.css"/;
const CONTEXT_FILES = new Set(["product.md", "design.md"]);
// impeccable reads a PRODUCT.md or DESIGN.md found here before it ever looks at
// IMPECCABLE_CONTEXT_DIR, and prefers this sidecar over the App folder's.
const SHADOWING_DIRS = [".", "docs", ".agents/context", DESIGN_PACKAGE];
const PACKAGE_SIDECAR = `${DESIGN_PACKAGE}/.impeccable/design.json`;

export type SyncOptions = { check?: boolean; from?: string };
export type SyncResult = { changed: string[] };

const header = (design: string) =>
  `<!-- Generated from src/designs/${design}/DESIGN.md by design:sync. Edit through /aof-design. -->\n`;

const readIfExists = (path: string): string | null =>
  existsSync(path) ? readFileSync(path, "utf8") : null;

const assertNoShadowingContext = (root: string) => {
  for (const dir of SHADOWING_DIRS) {
    const abs = join(root, dir);
    if (!existsSync(abs)) {
      continue;
    }
    const hit = readdirSync(abs).find((name) =>
      CONTEXT_FILES.has(name.toLowerCase())
    );
    if (hit) {
      const path = dir === "." ? hit : `${dir}/${hit}`;
      throw new Error(
        `${path} shadows the App context impeccable reads; move it into ${APPS_DIR}/<app>/`
      );
    }
  }
  if (existsSync(join(root, PACKAGE_SIDECAR))) {
    throw new Error(
      `${PACKAGE_SIDECAR} overrides every App's DESIGN.json; move it into the App folder`
    );
  }
};

/** App folder name to the Design its styles.css imports. */
export const wornDesigns = (root: string): Map<string, string> => {
  const worn = new Map<string, string>();
  const appsDir = join(root, APPS_DIR);
  if (!existsSync(appsDir)) {
    return worn;
  }
  // Sorted: readdir order differs across filesystems, and `changed` is read
  // in order by CI output and tests.
  const entries = readdirSync(appsDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) {
      continue;
    }
    const styles = readIfExists(join(appsDir, entry.name, "styles.css"));
    const design = styles?.match(DESIGN_IMPORT)?.[1];
    if (!design) {
      continue;
    }
    if (!existsSync(join(root, DESIGNS_DIR, design))) {
      throw new Error(
        `App "${entry.name}" imports unknown Design "${design}" in its styles.css`
      );
    }
    worn.set(entry.name, design);
  }
  return worn;
};

const expectedCopies = (root: string, app: string, design: string) => {
  const source = join(root, DESIGNS_DIR, design);
  const md = readIfExists(join(source, DESIGN_MD));
  return [
    [`${APPS_DIR}/${app}/${DESIGN_MD}`, md === null ? null : header(design) + md],
    [`${APPS_DIR}/${app}/${DESIGN_JSON}`, readIfExists(join(source, DESIGN_JSON))],
  ] as const;
};

const pullFrom = (root: string, app: string, design: string) => {
  const appDir = join(root, APPS_DIR, app);
  const source = join(root, DESIGNS_DIR, design);
  const md = readIfExists(join(appDir, DESIGN_MD));
  if (md !== null) {
    const generated = header(design);
    writeFileSync(
      join(source, DESIGN_MD),
      md.startsWith(generated) ? md.slice(generated.length) : md
    );
  }
  const json = readIfExists(join(appDir, DESIGN_JSON));
  if (json !== null) {
    writeFileSync(join(source, DESIGN_JSON), json);
  }
};

/**
 * Copies each Design's DESIGN.md (behind a generated header) and DESIGN.json
 * into every App folder wearing it. `from` first copies one App's edited
 * copies back to the Design; `check` writes nothing and reports the drift.
 */
export const syncDesigns = (
  root: string,
  options: SyncOptions = {}
): SyncResult => {
  if (options.check && options.from !== undefined) {
    throw new Error("--check and --from cannot run together");
  }
  assertNoShadowingContext(root);
  const worn = wornDesigns(root);
  if (options.from !== undefined) {
    const design = worn.get(options.from);
    if (!design) {
      throw new Error(
        `App "${options.from}" wears no Design: its ${APPS_DIR}/${options.from}/styles.css imports none`
      );
    }
    pullFrom(root, options.from, design);
  }
  const changed: string[] = [];
  for (const [app, design] of worn) {
    for (const [path, content] of expectedCopies(root, app, design)) {
      const abs = join(root, path);
      if (readIfExists(abs) === content) {
        continue;
      }
      changed.push(path);
      if (options.check) {
        continue;
      }
      if (content === null) {
        rmSync(abs);
      } else {
        writeFileSync(abs, content);
      }
    }
  }
  return { changed };
};
```

- [x] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @allonfire/design test`
Expected: PASS, every test in `sync.test.ts`.

- [x] **Step 6: Type-check and format**

Run: `pnpm --filter @allonfire/design check-types && pnpm exec biome check --write packages/design/package.json packages/design/tsconfig.json packages/design/vitest.config.ts packages/design/scripts`
Expected: no errors. A lint finding is fixed in code, never ignored.

---

### Task 3: `design:sync` CLI, CI and ignores

**Files:**
- Create: `packages/design/scripts/sync.ts`
- Modify: `package.json` (root scripts)
- Modify: `.github/workflows/ci.yml:36-38`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `syncDesigns(root, { check, from })` from Task 2.
- Produces: `pnpm design:sync [--check] [--from <app>]`, exit 1 on `--check` drift.

- [x] **Step 1: Write the CLI**

`packages/design/scripts/sync.ts`:

```ts
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { syncDesigns } from "./sync-core";

// packages/design/scripts/ -> repo root, whatever directory pnpm runs from.
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const { values } = parseArgs({
  options: { check: { type: "boolean" }, from: { type: "string" } },
});

const { changed } = syncDesigns(ROOT, {
  check: values.check,
  from: values.from,
});

for (const path of changed) {
  console.log(`${values.check ? "stale" : "synced"} ${path}`);
}
if (values.check && changed.length > 0) {
  console.log("run `pnpm design:sync` (or `/aof-design`) to regenerate");
  process.exitCode = 1;
}
```

- [x] **Step 2: Add the root script**

In root `package.json` `scripts`, keeping alphabetical order after `"db:update"`:

```json
    "design:sync": "pnpm --filter @allonfire/design design:sync",
```

- [x] **Step 3: Run it on the real repo**

Run: `pnpm design:sync --check; echo "exit=$?"`
Expected: no `stale` lines, `exit=0` (no App folder wears a Design yet).

Run: `pnpm design:sync --check --from x; echo "exit=$?"`
Expected: `Error: --check and --from cannot run together`, non-zero exit.

- [x] **Step 4: Add the CI step**

In `.github/workflows/ci.yml`, after the `Lint` step:

```yaml
      - name: Design copies in sync
        run: pnpm design:sync --check
```

- [x] **Step 5: Ignore impeccable's session state**

Append to `.gitignore`:

```gitignore

# impeccable: packages/design/.impeccable keeps config.json and surfaces/;
# everything else is per-session. Live mode also writes into the App and the
# repo root for a session (ADR 0011).
packages/design/.impeccable/critique/
packages/design/.impeccable/mocks/
packages/design/.impeccable/live/
**/.impeccable/config.local.json
apps/*/.impeccable/
/.impeccable/
```

Run: `git check-ignore -v apps/back-office/.impeccable/live/x packages/design/.impeccable/mocks/a.png && ! git check-ignore -q packages/design/.impeccable/surfaces/home.md && echo ok`
Expected: two ignore matches, then `ok`.

- [x] **Step 6: Format**

Run: `pnpm exec biome check --write packages/design/scripts/sync.ts package.json`
Expected: no errors.

---

### Task 4: Back office Screens

**Files:**
- Create: `packages/design/src/apps/back-office/styles.css`
- Create: `packages/design/src/apps/back-office/screens/home.tsx`
- Create: `packages/design/src/apps/back-office/screens/not-found.tsx`
- Create: `packages/design/src/apps/back-office/screens/error.tsx`
- Test: `packages/design/src/apps/back-office/screens/tests/screens.test.tsx`
- Modify: `packages/design/package.json` (`exports`)
- Modify: `apps/back-office/package.json` (dependency)
- Modify: `apps/back-office/next.config.ts:14`
- Modify: `apps/back-office/src/app/globals.css`
- Modify: `apps/back-office/src/app/[locale]/page.tsx`
- Modify: `apps/back-office/src/app/[locale]/not-found.tsx`
- Modify: `apps/back-office/src/app/[locale]/error.tsx`
- Delete: `packages/ui/src/styles/theme-back-office.css`
- Modify: `packages/ui/src/styles/base.css:1-4` (comment)

**Interfaces:**
- Consumes: `AOFButton` from `@allonfire/ui/components/aof-button`.
- Produces:
  - `HomeScreen({ copy }: { copy: HomeScreenCopy })`, `type HomeScreenCopy = { action: string; description: string; title: string }`
  - `NotFoundScreen({ back, copy }: { back: ReactNode; copy: NotFoundScreenCopy })`, `type NotFoundScreenCopy = { title: string }`
  - `ErrorScreen({ copy, onRetry }: { copy: ErrorScreenCopy; onRetry: () => void })` (client), `type ErrorScreenCopy = { retry: string; title: string }`
  - Exports `@allonfire/design/apps/back-office/screens/<name>` and `@allonfire/design/apps/back-office/styles.css`.

- [x] **Step 1: Write the failing tests**

`packages/design/src/apps/back-office/screens/tests/screens.test.tsx`:

```tsx
// @module-tag unit
import { isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorScreen } from "../error";
import { HomeScreen } from "../home";
import { NotFoundScreen } from "../not-found";

// Walks a rendered element tree for the first element whose props carry
// `onClick`, so the retry wiring is checked without a DOM.
const findClickable = (node: unknown): ReactElement<{ onClick?: unknown }> | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findClickable(child);
      if (hit) {
        return hit;
      }
    }
    return null;
  }
  if (!isValidElement<{ children?: unknown; onClick?: unknown }>(node)) {
    return null;
  }
  return node.props.onClick === undefined ? findClickable(node.props.children) : node;
};

describe("HomeScreen", () => {
  it("renders its copy with an AOF button", () => {
    const html = renderToStaticMarkup(
      <HomeScreen copy={{ action: "Get started", description: "Nothing here yet.", title: "Back office" }} />
    );
    expect(html).toContain("<h1");
    expect(html).toContain(">Back office<");
    expect(html).toContain(">Nothing here yet.<");
    expect(html).toContain('data-slot="button"');
    expect(html).toContain(">Get started<");
  });
});

describe("NotFoundScreen", () => {
  it("renders its title and the back slot", () => {
    const html = renderToStaticMarkup(
      <NotFoundScreen back={<a href="/">Home</a>} copy={{ title: "Page not found" }} />
    );
    expect(html).toContain(">Page not found<");
    expect(html).toContain('<a href="/">Home</a>');
  });
});

describe("ErrorScreen", () => {
  it("renders its copy and wires onRetry to the button", () => {
    const onRetry = () => undefined;
    const copy = { retry: "Try again", title: "Something went wrong" };
    const html = renderToStaticMarkup(<ErrorScreen copy={copy} onRetry={onRetry} />);
    expect(html).toContain(">Something went wrong<");
    expect(html).toContain(">Try again<");
    expect(findClickable(ErrorScreen({ copy, onRetry }))?.props.onClick).toBe(onRetry);
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @allonfire/design test`
Expected: FAIL, `Failed to resolve import "../error"`.

- [x] **Step 3: Write the Screens**

`packages/design/src/apps/back-office/screens/home.tsx`:

```tsx
import { AOFButton } from "@allonfire/ui/components/aof-button";

export type HomeScreenCopy = {
  action: string;
  description: string;
  title: string;
};

export const HomeScreen = ({ copy }: { copy: HomeScreenCopy }) => (
  <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
    <h1 className="font-semibold text-2xl">{copy.title}</h1>
    <p className="text-muted-foreground">{copy.description}</p>
    <AOFButton>{copy.action}</AOFButton>
  </main>
);
```

`packages/design/src/apps/back-office/screens/not-found.tsx`:

```tsx
import type { ReactNode } from "react";

export type NotFoundScreenCopy = { title: string };

// `back` is the App's locale-aware link; the Screen only places and styles it.
export const NotFoundScreen = ({
  back,
  copy,
}: {
  back: ReactNode;
  copy: NotFoundScreenCopy;
}) => (
  <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
    <h1 className="font-semibold text-2xl">{copy.title}</h1>
    <nav className="[&_a]:underline">{back}</nav>
  </main>
);
```

`packages/design/src/apps/back-office/screens/error.tsx`:

```tsx
"use client";

import { AOFButton } from "@allonfire/ui/components/aof-button";

export type ErrorScreenCopy = { retry: string; title: string };

export const ErrorScreen = ({
  copy,
  onRetry,
}: {
  copy: ErrorScreenCopy;
  onRetry: () => void;
}) => (
  <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8">
    <h1 className="font-semibold text-2xl">{copy.title}</h1>
    <AOFButton onClick={onRetry} type="button">
      {copy.retry}
    </AOFButton>
  </main>
);
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @allonfire/design test`
Expected: PASS, the Screens' tests plus Task 2's.

- [x] **Step 5: The App's stylesheet in the package**

`packages/design/src/apps/back-office/styles.css`:

```css
/* Back office's single stylesheet: ui's base layer, the Design it wears, and
   where Tailwind finds its Screens. The App imports only this file. A Design
   is worn by importing its theme.css here (`/aof-design new` adds it). */
@import "@allonfire/ui/styles/base.css";

@source "./screens";
```

Add to `packages/design/package.json` `exports` (replacing `{}`):

```json
  "exports": {
    "./apps/back-office/screens/*": "./src/apps/back-office/screens/*.tsx",
    "./apps/back-office/styles.css": "./src/apps/back-office/styles.css"
  },
```

Node allows one `*` per export key, so each App adds its own two lines.

- [x] **Step 6: Wire Back office to the package**

`apps/back-office/package.json` `dependencies`, alphabetically before `@allonfire/ui`:

```json
    "@allonfire/design": "workspace:*",
```

`apps/back-office/next.config.ts` line 14:

```ts
  transpilePackages: ["@allonfire/design", "@allonfire/shadcn", "@allonfire/ui"],
```

`apps/back-office/src/app/globals.css` (whole file):

```css
@import "@allonfire/design/apps/back-office/styles.css";

@source "../";
```

`apps/back-office/src/app/[locale]/page.tsx` (whole file):

```tsx
import { HomeScreen } from "@allonfire/design/apps/back-office/screens/home";
import { getTranslations } from "next-intl/server";

const HomePage = async () => {
  const t = await getTranslations("Home");
  return (
    <HomeScreen
      copy={{
        action: t("action"),
        description: t("description"),
        title: t("title"),
      }}
    />
  );
};

export default HomePage;
```

`apps/back-office/src/app/[locale]/not-found.tsx` (whole file):

```tsx
import { NotFoundScreen } from "@allonfire/design/apps/back-office/screens/not-found";
import { getTranslations } from "next-intl/server";
import { Link } from "@/features/i18n/navigation";

const NotFound = async () => {
  const t = await getTranslations("NotFound");
  return (
    <NotFoundScreen
      back={<Link href="/">{t("back")}</Link>}
      copy={{ title: t("title") }}
    />
  );
};

export default NotFound;
```

`apps/back-office/src/app/[locale]/error.tsx` (whole file):

```tsx
"use client";

import { ErrorScreen } from "@allonfire/design/apps/back-office/screens/error";
import { useTranslations } from "next-intl";

type ErrorProps = { error: Error & { digest?: string }; retry: () => void };

// `retry` re-fetches and re-renders the segment (stable since Next 16.3);
// `reset` would re-render the failed server payload as it was.
const ErrorPage = ({ retry }: ErrorProps) => {
  const t = useTranslations("Error");
  return (
    <ErrorScreen copy={{ retry: t("retry"), title: t("title") }} onRetry={retry} />
  );
};

export default ErrorPage;
```

- [x] **Step 7: Drop the per-App Theme**

Run: `git rm -q packages/ui/src/styles/theme-back-office.css && grep -rn "theme-back-office" --exclude-dir=node_modules --exclude-dir=.git . | grep -v '/\._' | grep -v docs/superpowers`
Expected: no output.

Replace the comment at the top of `packages/ui/src/styles/base.css` (lines 1-4) with:

```css
/* The base every App starts from: shadcn's generated tokens and base layer,
   plus where Tailwind looks for classes in ui and shadcn. An App reaches it
   through its stylesheet in @allonfire/design, which adds the Design's
   tokens on top (ADR 0011). */
```

- [x] **Step 8: Verify Back office end to end**

Run: `pnpm install && pnpm --filter @allonfire/design check-types && pnpm --filter @allonfire/back-office check-types && pnpm --filter @allonfire/back-office build`
Expected: all pass.

Run: `pnpm --filter @allonfire/back-office test:e2e`
Expected: the three smoke tests pass (heading "Back office", "Get started" button, localized 404).

- [x] **Step 9: Format**

Run: `pnpm exec biome check --write packages/design/src packages/design/package.json apps/back-office/package.json apps/back-office/next.config.ts "apps/back-office/src/app" packages/ui/src/styles/base.css`
Expected: no errors.

---

### Task 5: The `aof-design` skill

**Files:**
- Create: `.claude/skills/aof-design/SKILL.md`
- Create: `packages/design/src/apps/back-office/PRODUCT.md` (only to verify context loading, then removed in Step 3; the real one comes from Task 8)

**Interfaces:**
- Consumes: `pnpm design:sync [--check] [--from <app>]` (Task 3); the Screens layout (Task 4); the `impeccable` skill (Task 1).
- Produces: `/aof-design <command> [target] [--app <app>]` and `/aof-design new <name> --app <app>`.

- [x] **Step 1: Write the skill**

`.claude/skills/aof-design/SKILL.md`:

````markdown
---
name: aof-design
description: >
  The only way to design, build or edit an AllOnFire page. Wraps impeccable
  (every command: craft, shape, critique, audit, polish, live, colorize,
  typeset, layout, harden, document, init and the rest) so it works inside
  packages/design, where every App's Screens, product context and the shared
  Designs live. Use when asked to design, redesign, build, style, polish,
  critique or audit any App page or Screen, to create a Design ("new"), or when
  the user types /aof-design. Never run plain /impeccable in this repo.
---

# aof-design

`packages/design` is the center point of every App's interface (ADR 0011):

```
packages/design/
  .impeccable/                  impeccable state (config.json, surfaces/ tracked)
  src/designs/<name>/           a Design: DESIGN.md, DESIGN.json, theme.css (source)
  src/apps/<app>/               PRODUCT.md (source), DESIGN.md + DESIGN.json
                                (generated copies of the worn Design),
                                styles.css (the App's one stylesheet),
                                screens/*.tsx (the App's Screens)
```

An App imports `@allonfire/design/apps/<app>/styles.css` and its Screens; its
pages only route, fetch and translate.

Invocation: `/aof-design <command> [target] [--app <app>]`, where `<command>`
is any impeccable command, or `new`.

## Every impeccable command

1. **App.** From `target` when it is under `apps/<app>/` or
   `packages/design/src/apps/<app>/`; else `--app`; else the only folder under
   `packages/design/src/apps/`. Ambiguous: ask which App.
2. **Design.** Read `packages/design/src/apps/<app>/styles.css` for
   `@import "../../designs/<name>/theme.css"`. None: stop and say
   `/aof-design new <name> --app <app>` comes first.
3. **Sync in.** `pnpm design:sync`. If it throws about a shadowing
   `PRODUCT.md`/`DESIGN.md` or `.impeccable/design.json`, move that file as the
   message says before anything else.
4. **Target in the package.** impeccable keeps `.impeccable/` at the project
   root of its target, so the target is always inside `packages/design`:
   - an App page maps to its Screen:
     `apps/<app>/src/app/[locale]/page.tsx` to
     `packages/design/src/apps/<app>/screens/home.tsx`; any other route
     `apps/<app>/src/app/[locale]/<route>/page.tsx` to
     `packages/design/src/apps/<app>/screens/<route>.tsx`;
   - a new page gets a new Screen file there first;
   - no file named: `packages/design/src/apps/<app>/`.
5. **Hand off.** Invoke the `impeccable` skill with the command and
   `--target <package path>`. Run **every** impeccable launcher command with
   `IMPECCABLE_CONTEXT_DIR=packages/design/src/apps/<app>` in front, for
   example
   `IMPECCABLE_CONTEXT_DIR=packages/design/src/apps/back-office .claude/skills/impeccable/scripts/impeccable context --target packages/design/src/apps/back-office/screens/home.tsx`.
   Give impeccable the repo rules below before the command.
6. **Wire the page.** When a Screen was created or its `copy` changed: add the
   keys to the App's `src/features/i18n/translations/en.json` and `it.json`,
   and make the App page render the Screen with `copy` built from
   `getTranslations` (Server) or `useTranslations` (client). A new Screen file
   also needs nothing in `exports`: `./apps/<app>/screens/*` covers it.
7. **Tokens.** If `packages/design/src/designs/<name>/theme.css` changed, run
   impeccable `document` in scan mode against the App folder (same env and
   target rules) so the App's `DESIGN.md`/`DESIGN.json` describe the new
   tokens. `theme.css` wins whenever the two disagree.
8. **Sync out.** If impeccable wrote `packages/design/.impeccable/design.json`,
   move it to `packages/design/src/apps/<app>/DESIGN.json`. Then, if the App's
   `DESIGN.md` or `DESIGN.json` changed, `pnpm design:sync --from <app>` and
   report which other Apps now carry the change.
9. **Live cleanup.** After `live`, delete `apps/<app>/.impeccable/` and the
   repo root's `.impeccable/` if the session left them. Both are gitignored;
   nothing else of impeccable may stay outside `packages/design`.
10. **Check.** `pnpm design:sync --check`, then
    `pnpm --filter @allonfire/design test` and
    `pnpm exec biome check --write` on the files the run touched.

## Repo rules to hand impeccable

- Tokens change only in `packages/design/src/designs/<name>/theme.css`
  (`:root`, `.dark`, `@theme inline` on shadcn's variable names:
  `--background`, `--foreground`, `--primary`, `--muted`, `--radius`, ...).
  Never in an App's CSS, never in a Screen's classes as raw values.
- A Screen lives in `packages/design/src/apps/<app>/screens/<name>.tsx`, one
  named export (`HomeScreen`). It takes its text as a typed `copy` prop and
  App-owned elements (the i18n `Link`) as `ReactNode` slots. It never imports
  `next-intl`, `next/*` routing or anything from `apps/`. Server Component
  unless it needs state, effects or event handlers; then `"use client"` on the
  smallest part. Every Screen gets a render test in `screens/tests/`.
- Components come from `@allonfire/ui/components/aof-*` (AOF components). A
  missing one is created in `packages/ui/src/components/aof-<name>.tsx` with a
  test, composing shadcn components. Never import `@allonfire/shadcn` outside
  `packages/ui`, never edit `packages/shadcn`: a missing primitive is
  `npx shadcn@4.21.0 add <name>` from `apps/back-office`, then
  `pnpm --filter @allonfire/shadcn canonicalize`.
- Mobile-first. Every image carries width and height. Framer Motion for
  anything beyond a CSS transition.

## new <name> --app <app>

1. Create `packages/design/src/designs/<name>/`. If
   `packages/design/src/apps/<app>/` is missing, create it with a
   `styles.css` importing `@allonfire/ui/styles/base.css` and
   `@source "./screens";`, and add the App's two export lines to
   `packages/design/package.json`:
   `"./apps/<app>/screens/*": "./src/apps/<app>/screens/*.tsx"`,
   `"./apps/<app>/styles.css": "./src/apps/<app>/styles.css"`.
2. If the App folder has no `PRODUCT.md`, or it is a placeholder, run
   impeccable `init` there (env and target rules above).
3. Run impeccable's new-work / `document` seed flow for the App, so it writes
   `packages/design/src/apps/<app>/DESIGN.md` and `DESIGN.json`.
4. Write `packages/design/src/designs/<name>/theme.css` from the `DESIGN.md`
   frontmatter tokens, mapped onto shadcn's variables in `:root` and `.dark`,
   plus `@theme inline` for any token shadcn has no variable for.
5. Add `@import "../../designs/<name>/theme.css";` to the App's `styles.css`
   after the base import, then `pnpm design:sync --from <app>`.

Wearing a different Design is changing that one import, then
`pnpm design:sync`.
````

- [x] **Step 2: Verify impeccable resolves the App context from the package**

```bash
printf '# Back office\n\nPlaceholder for the context check.\n' > packages/design/src/apps/back-office/PRODUCT.md
IMPECCABLE_CONTEXT_DIR=packages/design/src/apps/back-office \
  .claude/skills/impeccable/scripts/impeccable context \
  --target packages/design/src/apps/back-office/screens/home.tsx | head -20
```

Expected: the output leads with the placeholder `PRODUCT.md` text, and names `packages/design` as the project root. Then run the same command without the env var:
Expected: a `NO_PRODUCT_MD`-style directive, so plain `/impeccable` is visibly unbriefed.

Then check that the edit hook tolerates the missing context. Touch a Screen through an Edit (add and remove a blank line in `screens/home.tsx`) and read the hook's status line.
Expected: no hook error. If it errors, add under "Every impeccable command" in `SKILL.md`: "The edit hook runs without context; its errors about a missing PRODUCT.md are expected outside `/aof-design`", and quote the exact line.

- [x] **Step 3: Remove the placeholder**

Run: `rm packages/design/src/apps/back-office/PRODUCT.md`
Expected: `git status --short packages/design/src/apps/back-office` shows no `PRODUCT.md`.

- [x] **Step 4: Settle live mode against a Screen**

Start Back office (`pnpm --filter @allonfire/back-office dev`), then:

```bash
IMPECCABLE_CONTEXT_DIR=packages/design/src/apps/back-office \
  .claude/skills/impeccable/scripts/impeccable live --target apps/back-office/src/app/[locale]/page.tsx
```

Read `pageFiles` in the JSON. Then stop the helper, stop the dev server and run step 9 of the skill (delete `apps/back-office/.impeccable/` and `/.impeccable/`).
Expected, one of:
- `pageFiles` can include `packages/design/src/apps/back-office/screens/home.tsx`: record nothing extra.
- It cannot: add to `SKILL.md` step 5: "For `live`, target the App page (`apps/<app>/src/app/...`); live edits land in the page, and before cleanup you move any markup it added into the Screen and restore the page to translate-and-render." Then add the same to the spec's "Unknowns" as settled.

- [x] **Step 5: Format**

Run: `pnpm exec biome check --write .claude/skills/aof-design/SKILL.md 2>/dev/null; git status --short .claude/skills/aof-design`
Expected: the skill file is listed (Biome skips Markdown; this only confirms the file).

---

### Task 6: Rename `doc-gen` to `aof-documentation`

**Files:**
- Move: `.claude/skills/doc-gen/` to `.claude/skills/aof-documentation/`
- Modify: `.claude/skills/aof-documentation/SKILL.md:1-12`
- Modify: `.claude/skills/aof-documentation/references/doc-map.md`

**Interfaces:**
- Produces: the `aof-documentation` skill (same behavior, new name).

- [x] **Step 1: Move the folder**

Run: `git mv .claude/skills/doc-gen .claude/skills/aof-documentation`
Expected: `git status --short` shows renames.

- [x] **Step 2: Rename inside the skill**

In `.claude/skills/aof-documentation/SKILL.md`:
- frontmatter `name: doc-gen` becomes `name: aof-documentation`;
- in the description, `"add docs", or "doc-gen".` becomes `"add docs", or "aof-documentation".`;
- `# Doc-Gen Skill` becomes `# AOF Documentation Skill`.

Run: `grep -rn "doc-gen\|Doc-Gen" .claude/skills/aof-documentation`
Expected: no output (fix any remaining mention the same way).

- [x] **Step 3: Teach it the design package**

In `.claude/skills/aof-documentation/references/doc-map.md`, add to the packages inventory (match the file's existing table or list format):
- `packages/design/README.md`: Designs, Screens, `design:sync`, `/aof-design`.
- `packages/design/src/apps/<app>/PRODUCT.md`: kept by impeccable through `/aof-design`, never hand-generated.
- `packages/design/src/apps/<app>/DESIGN.md`: generated by `design:sync`; never document or edit it by hand.

- [x] **Step 4: Verify the skill is discoverable**

Run: `head -8 .claude/skills/aof-documentation/SKILL.md && test ! -e .claude/skills/doc-gen && echo gone`
Expected: the new frontmatter, then `gone`.

---

### Task 7: Documentation

**Files:**
- Create: `packages/design/README.md`
- Modify: `CLAUDE.md` (Package Layout exemption; "Design system" section)

**Interfaces:**
- Consumes: everything above; CONTEXT.md and ADR 0011 already exist.

- [x] **Step 1: Write the package README**

`packages/design/README.md` (follow the repo's README style: centered header, HTML badges):

````markdown
<h1 align="center">@allonfire/design</h1>

<p align="center">
  <img src="https://img.shields.io/badge/impeccable-4-111111" alt="impeccable" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
</p>

<p align="center">Where every App's interface is designed: the shared Designs, each App's Screens and product context, and impeccable's state.</p>

## What it is

A **Design** is a named visual world that one or more Apps wear (Japan is the
first). A **Screen** is the interface of one App page, built from AOF
components. An App imports one stylesheet and its Screens from here; its pages
only route, fetch data and translate. See ADR 0011.

Every change goes through `/aof-design`, which runs impeccable against this
package. Plain `/impeccable` finds no product context here on purpose.

## Layout

```
.impeccable/            impeccable state: config.json and surfaces/ are tracked
scripts/sync.ts         design:sync
src/designs/<name>/     DESIGN.md, DESIGN.json, theme.css (the source)
src/apps/<app>/         PRODUCT.md, styles.css, screens/,
                        DESIGN.md + DESIGN.json (generated copies)
```

## Exports

| Export | Contents |
|--------|----------|
| `./apps/back-office/styles.css` | ui's base, the worn Design's tokens, `@source` for the Screens |
| `./apps/back-office/screens/*` | `HomeScreen`, `NotFoundScreen`, `ErrorScreen` |

## design:sync

```bash
pnpm design:sync                 # copy each Design into the Apps wearing it
pnpm design:sync --check         # CI: exit 1 when a copy drifted
pnpm design:sync --from <app>    # copy an App's edited copy back, fan out
```

It also refuses to run while a `PRODUCT.md` or `DESIGN.md` sits at the repo
root, in `docs/`, in `.agents/context/` or at this package's root: impeccable
would read it instead of the App's.

## Tests

```bash
pnpm --filter @allonfire/design test
pnpm --filter @allonfire/design check-types
```
````

- [x] **Step 2: Update CLAUDE.md**

In the "Package Layout" section, change the exemption sentence to:

```markdown
`packages/shadcn`, `packages/ui`, `packages/hooks` and `packages/design` are
exempt: the first three follow shadcn's `components/` and `lib/` so
`shadcn add` works; `packages/design` holds Designs and Apps (ADR 0011).
```

Replace the "### Design system" section body with:

```markdown
`packages/design` is where every App's interface is designed (ADR 0011). It
holds the Designs (`src/designs/<name>/`: `DESIGN.md`, `DESIGN.json`,
`theme.css`), each App's `PRODUCT.md`, stylesheet and Screens
(`src/apps/<app>/`), and impeccable's state. Build or edit any page with
`/aof-design`, never plain `/impeccable`. An App imports
`@allonfire/design/apps/<app>/styles.css` and its Screens; its pages only
route, fetch and translate, passing text as a Screen's typed `copy` prop.
`pnpm design:sync` copies a Design into the Apps wearing it; CI runs
`--check`.

`packages/shadcn` is written only by tools: run `npx shadcn@4.21.0 add <name>`
from `apps/back-office` and it lands there, then
`pnpm --filter @allonfire/shadcn canonicalize`, which rewrites the CLI's
classes to their canonical Tailwind spelling against the package's own theme.
Never edit it by hand. AOF components live in `packages/ui`, the only package
that imports `@allonfire/shadcn` (Biome enforces it). An AOF component is
named with the `AOF` prefix, `AOFButton` in
`packages/ui/src/components/aof-button.tsx`. See ADR 0010.
```

- [x] **Step 3: Verify links and names**

Run: `grep -n "aof-design\|ADR 0011\|packages/design" CLAUDE.md | head && grep -c "Theme" CLAUDE.md`
Expected: the new lines appear; any remaining "Theme" hits refer to something other than the removed per-App Theme (fix them if not).

---

### Task 8: Japan, the first Design (interactive)

**Files:**
- Create: `packages/design/src/apps/back-office/PRODUCT.md` (written by impeccable `init`)
- Create: `packages/design/src/designs/japan/{DESIGN.md,DESIGN.json,theme.css}`
- Create: `packages/design/src/apps/back-office/{DESIGN.md,DESIGN.json}` (generated)
- Create: `packages/design/.impeccable/config.json`, `packages/design/.impeccable/surfaces/*.md` (written by impeccable)
- Modify: `packages/design/src/apps/back-office/styles.css`

**Interfaces:**
- Consumes: `/aof-design new` (Task 5), `design:sync` (Task 3).

- [x] **Step 1: Run the skill**

Invoke `/aof-design new japan --app back-office` and follow it. impeccable interviews the user for Back office's `PRODUCT.md` (users: the family's admins managing content and users) and then for Japan's visual world. The palette, type and motion come from those answers, not from this plan. Do not answer the interviews on the user's behalf.

- [x] **Step 2: Verify the wiring**

Run: `grep -n 'designs/japan/theme.css' packages/design/src/apps/back-office/styles.css && pnpm design:sync --check; echo "exit=$?"`
Expected: the import line, no `stale` lines, `exit=0`.

Run: `ls .impeccable apps/back-office/.impeccable 2>&1 | grep -c "No such file"`
Expected: `2` (nothing of impeccable outside `packages/design`).

- [x] **Step 3: Verify Back office wears it**

Run: `pnpm --filter @allonfire/design test && pnpm --filter @allonfire/back-office build && pnpm --filter @allonfire/back-office test:e2e`
Expected: all pass. Then run `pnpm --filter @allonfire/back-office dev` and let the user look at `/` and `/does-not-exist`.

- [x] **Step 4: Format**

Run: `pnpm exec biome check --write packages/design/src/designs/japan/theme.css packages/design/src/apps/back-office/styles.css`
Expected: no errors.

## Implementation Log
- Implemented: 2026-09-30T09:21:18Z
- Workspace: fresh-branch — feat/design-package
- Committed: no — awaiting user review
