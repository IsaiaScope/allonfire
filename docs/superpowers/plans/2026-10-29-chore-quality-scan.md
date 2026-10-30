# Quality Scan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add knip and jscpd to the repo as scripts, then read every file in the workspace and write one verified findings report the owner picks fixes from.

**Status:** implemented (uncommitted) @ 2026-10-29T10:27:07Z

**Architecture:** Two tools give the mechanical findings: knip for dead files, exports and dependencies, and jscpd for copy-paste across the whole workspace. Eight area readers read every file, each returning findings plus an inventory. A cross-package reader compares the inventories, and independent verifiers re-check every finding. The report is written last. Nothing outside the two tools' setup changes product code.

**Tech Stack:** knip 6.x, jscpd 5.x, pnpm 9 workspace, Turbo, the Agent tool for the readers.

**Spec:** `docs/superpowers/specs/2026-10-29-quality-scan-design.md`

## Global Constraints

- **In scope:**
  - `apps/api` and `apps/back-office`;
  - `packages/auth`, `config`, `core`, `database`, `design`, `storage`, `ui`;
  - root `package.json`, `turbo.json`, `.husky/`, `.github/workflows/`, `docker/`.
- **Out of scope:**
  - `apps/laura`, `packages/auth-old`, `packages/ui-old`;
  - everything inside `packages/shadcn`, except components nothing uses;
  - generated files (Prisma client, `.next`, `tsbuildinfo`) and `**/._*`.
- Both new dev dependencies pass the 200k weekly-download rule: knip about 22M, jscpd about 3.9M.
- Both tools ignore `**/._*`.
- No CI or pre-commit gate for either tool.
- No product code changes. The only repo edits are the two tools' configs, their scripts, `package.json`, `pnpm-lock.yaml`, `.gitignore` and the report.
- The tree is scanned **as it stands**, uncommitted Edit User work included. Findings in uncommitted files are marked `in progress`.
- **Yardsticks:**
  1. Written rules: `AGENTS.md`, `.claude/CLAUDE.md`, `docs/agents/*.md`, `docs/adr/*.md`.
  2. Judgement, where the written rules are silent.
  Every finding names its yardstick.
- **Finding kinds:** `repetition`, `missed-reuse`, `structure`, `error-handling`, `dead-code`, `clarity`.
- **Fix sizes:** `S` is one file and under an hour. `M` is a few files or one package. `L` crosses packages or needs a decision.
- An exported subpath that no App, script or config imports counts as dead.
- Laura-only code is never dead. It goes in its own section, "Held only by Laura".
- When a rule and most of the code disagree, there is one "rule outdated" finding against the doc, not one per file.
- Unused shadcn components are reported with the fix "remove through the shadcn CLI".
- A judgement finding that recurs with no rule behind it gets a proposed rule under "Rules to write".
- Never commit. The owner runs `/iso-commit`.

## Review Focus

- **knip lists live code as dead.** Next routes and special files, Hono `index.ts`, the CLIs run by `tsx` in scripts, test configs and setup files, and `e2e/` specs must not appear as unused. Task 1's verification lists them.
- **A reader samples instead of reading everything.** Each area's report states a file count that must equal the inventory's count. Task 4 checks this.
- **A finding that doesn't hold.** Every finding passes a verifier who did not raise it. Task 6.
- **Duplication between packages is missed.** jscpd runs over the whole workspace, and the cross-package reader runs over every inventory. Tasks 2 and 5.
- **Shifting `file:line`s in uncommitted files.** Task 3 records `git status` and the HEAD sha, and the report marks those findings `in progress`. Task 7.

---

## File Structure

| Path | Role |
|---|---|
| `knip.json` (new) | knip workspaces, ignores, `includeEntryExports` |
| `.jscpd.json` (new) | jscpd paths, ignores, thresholds |
| `package.json` (modify) | dev dependencies plus `knip` and `dupes` scripts |
| `.gitignore` (modify) | `.jscpd/` output |
| `.superpowers/quality-scan/` (scratch, git-ignored) | tool output, area findings, inventories, verifier verdicts |
| `docs/superpowers/specs/2026-10-29-quality-scan-report.md` (new) | the report |

---

### Task 1: knip, configured until it lists no live code

**Files:**
- Create: `knip.json`
- Modify: `package.json` (devDependencies, the `knip` script), `pnpm-lock.yaml`

**Interfaces:**
- Produces: `pnpm knip`, which runs `knip`, and `pnpm knip --reporter json`, used in Task 3.

- [x] **Step 1:** Run `pnpm add -Dw knip@^6.43.0`. Expected: `knip` is in root `devDependencies`.
- [x] **Step 2:** Add the script `"knip": "knip"` to root `package.json`, kept in alphabetical order.
- [x] **Step 3:** Write `knip.json`:
  - `$schema`: `https://unpkg.com/knip@6/schema.json`;
  - `ignore`: `["**/._*"]`. shadcn stays loaded; Task 4 keeps only its unused components;
  - `ignoreWorkspaces`: `[]` (Laura and the old packages are already outside `pnpm-workspace.yaml`);
  - `includeEntryExports`: `true`, so an exported subpath nobody imports is reported;
  - `workspaces`: an entry only where a plugin misses an entry point. For example `packages/database`: `entry: ["src/features/seed/cli.ts", "src/features/test-database/cli.ts", "scripts/*.ts"]`, and `packages/storage`: `entry: ["src/features/image/setup/cli.ts"]`.

  Leave every other entry to knip's plugins: next, vitest, playwright, and package.json scripts.
- [x] **Step 4:** Run `pnpm knip --reporter json > .superpowers/quality-scan/knip-try.json`, then list the unused files:
  ```bash
  node -e 'const r=require("./.superpowers/quality-scan/knip-try.json");for(const i of r.issues)if(i.files?.length)console.log(i.file)'
  ```
  Expected: none of these is listed as an unused file:
  - `apps/back-office/src/app/**` route or special files;
  - `apps/api/src/index.ts`;
  - any `*/cli.ts`;
  - `vitest*.config.ts` or `vitest*.setup.ts`;
  - `apps/back-office/e2e/*.spec.ts`;
  - `packages/config/tests/**`.
- [x] **Step 5:** For each live file still listed, add the missing `entry` or plugin config in `knip.json` and re-run Step 4. Never ignore a whole folder to silence it. Stop when Step 4's expected output holds.
- [x] **Step 6:** Run `pnpm lint`. Expected: clean. Biome formats `knip.json`; let it.

### Task 2: jscpd over the whole workspace

**Files:**
- Create: `.jscpd.json`
- Modify: `package.json` (devDependencies, the `dupes` script), `pnpm-lock.yaml`, `.gitignore`

**Interfaces:**
- Produces: `pnpm dupes`. Its JSON report lands in `.jscpd/jscpd-report.json`, used in Task 3.

- [x] **Step 1:** Run `pnpm add -Dw jscpd@^5.4.2`.
- [x] **Step 2:** Add the script `"dupes": "jscpd"`, and add `.jscpd/` to `.gitignore`.
- [x] **Step 3:** Write `.jscpd.json`:
  - `path`: `["apps/api", "apps/back-office", "packages"]`;
  - `format`: `["typescript", "tsx", "javascript"]`;
  - `minTokens`: `60`, `minLines`: `6`;
  - `reporters`: `["console", "json"]`, `output`: `".jscpd"`;
  - `gitignore`: `true`;
  - `ignore`:
    ```json
    ["**/._*", "**/node_modules/**", "**/.next/**", "packages/auth-old/**", "packages/ui-old/**", "packages/shadcn/**", "**/generated/**", "**/*.d.ts"]
    ```
- [x] **Step 4:** Run `pnpm dupes`. Expected:
  - it exits after printing a clone table;
  - `.jscpd/jscpd-report.json` exists;
  - no clone path contains `shadcn`, `laura`, `-old` or `/._`.
- [x] **Step 5:** Read the first 20 clones. If most are import blocks or JSX prop boilerplate, raise `minTokens` by 20 and re-run. Stop once most of the first 20 are real repeated logic. Record the final value in the report's method section.

### Task 3: Mechanical inputs for the readers

**Files:**
- Create (scratch): the following files in `.superpowers/quality-scan/`:
  - `head.txt` and `status.txt`;
  - `knip-report.json`;
  - `jscpd-report.json`;
  - `laura-imports.txt`;
  - `areas/<area>.files.txt`.

**Interfaces:**
- Consumes: `pnpm knip` (Task 1) and `pnpm dupes` (Task 2).
- Produces: the eight areas, and a file list for each: `api`, `back-office`, `auth`, `storage`, `database`, `core`, `ui`, `config-design-root`.

- [x] **Step 1:** Run `git rev-parse HEAD > head.txt` and `git status --short > status.txt`.
- [x] **Step 2:** Run `pnpm knip --reporter json > .superpowers/quality-scan/knip-report.json`, then `cp .jscpd/jscpd-report.json .superpowers/quality-scan/jscpd-report.json`.
- [x] **Step 3:** Collect Laura's imports into the scan folder:
  ```bash
  grep -rhoE "from \"@allonfire/(core|database|storage|auth|ui|config)[^\"]*\"" apps/laura/src \
    | sort | uniq -c | sort -rn > .superpowers/quality-scan/laura-imports.txt
  ```
- [x] **Step 4:** Write each area's file list with `git ls-files -co --exclude-standard <paths> | grep -v '/\._'`, keeping only `ts`, `tsx`, `js`, `mjs`, `json`, `css`, `sql`, `prisma`, `sh` and `yml`. The paths per area:

  | Area | Paths |
  |---|---|
  | `api` | `apps/api` |
  | `back-office` | `apps/back-office` |
  | `auth` | `packages/auth` |
  | `storage` | `packages/storage` |
  | `database` | `packages/database` |
  | `core` | `packages/core` |
  | `ui` | `packages/ui` |
  | `config-design-root` | `packages/config`, `packages/design`, root `package.json`, `turbo.json`, `.husky`, `.github/workflows`, `docker` |

  Expected: every area list is non-empty, and none contains `shadcn`, `laura` or `-old`.

### Task 4: Area readers

**Interfaces:**
- Consumes: Task 3's lists, plus the area's knip and jscpd entries.
- Produces: for each area, `findings/<area>.json` and `inventory/<area>.json` in `.superpowers/quality-scan/`:
  - finding: `{ id, area, file, line, kind, yardstick: "rule" | "judgement", rule?: "<doc path>#<heading>", summary, cost, fix, size: "S"|"M"|"L", inProgress: boolean }`;
  - inventory entry: `{ file, name, what: "helper"|"constant"|"type"|"component"|"stub"|"fixture", purpose }`;
  - each inventory file also carries `{ filesRead: number }`.

- [x] **Step 1:** Dispatch the eight readers in one message (Agent tool, `general-purpose`). Each prompt carries:
  - the area's file list path;
  - the yardsticks: read `AGENTS.md`, `.claude/CLAUDE.md` and every `docs/agents/*.md` the AGENTS.md table names for this area. ADRs are read on demand;
  - the six kinds with the spec's definitions;
  - the area's knip and jscpd entries, to confirm or drop. A tool hit is not a finding until the code has been read;
  - `status.txt`, so findings in modified files get `inProgress: true`;
  - for `ui` and `back-office`, the shadcn rule (unused components only);
  - the anti-goal: list only what's worth fixing, never taste alone;
  - "read every file in the list; set `filesRead`".
- [x] **Step 2:** For each area, check that `filesRead` equals the line count of `areas/<area>.files.txt`. Expected: equal. A short area gets its reader resumed with the missing files (SendMessage), not a fresh reader.

### Task 5: Cross-package reader

**Interfaces:**
- Consumes: every `inventory/*.json`, `jscpd-report.json` and `laura-imports.txt`.
- Produces: `findings/cross.json`, the same schema with `area: "cross"`, and `laura-only.json`, listing in-scope files and exports whose only consumer is Laura.

- [x] **Step 1:** Dispatch one reader. Its prompt asks it to:
  - group the inventory entries by purpose;
  - flag same-purpose code in two or more areas, citing both;
  - flag code that belongs in `core`, `ui` or a package's `shared/`;
  - turn every cross-area jscpd clone into a finding or drop it;
  - check every knip "unused" hit against `laura-imports.txt` and move Laura-held ones into `laura-only.json`.
- [x] **Step 2:** Expected: every cross finding names at least two files in different areas.

### Task 6: Verifiers

**Interfaces:**
- Consumes: `findings/*.json`.
- Produces: `verified/<area>.json`, with `{ id, verdict: "holds" | "drop", reason }` for every finding.

- [x] **Step 1:** Dispatch nine verifiers in one message, one per area plus one for cross. None of them is the agent that raised the findings. Each re-reads every finding at its `file:line` against the cited rule and returns a verdict. A dead-code finding holds only after a repo-wide grep shows no import, outside Laura.
- [x] **Step 2:** Expected: every finding id has exactly one verdict.

### Task 7: The report

**Files:**
- Create: `docs/superpowers/specs/2026-10-29-quality-scan-report.md`

**Interfaces:**
- Consumes: the findings whose verdict is `holds`, `laura-only.json`, `head.txt` and the jscpd threshold from Task 2.

- [x] **Step 1:** Write the report in this order:
  1. **Method**:
     - HEAD sha;
     - the scan read the tree as it stands, so `in progress` lines can move;
     - files read per area;
     - the knip and jscpd versions and the jscpd threshold;
     - findings raised against findings kept.
  2. **Shortlist**: the 15 findings that cost a maintainer most, ranked. Cross-area repetition and missed reuse come first, then error handling, then structure and dead code, then clarity.
  3. **One section per area**, then **Cross-package**. Each has a table with columns `#`, `file:line`, `kind`, `yardstick (rule)`, `finding`, `fix`, `size`. `in progress` is a tag in the finding cell.
  4. **Held only by Laura.**
  5. **Rules outdated**: docs that most of the code contradicts.
  6. **Rules to write**: each a one-line rule, the guide it goes in, and the findings that motivate it.
- [x] **Step 2:** Run `pnpm exec biome check docs/superpowers/specs/2026-10-29-quality-scan-report.md` if Biome formats Markdown here; otherwise skip. Then check that every table row has a `file:line` that exists: `test -f` on each path.
- [x] **Step 3:** Run `pnpm lint && pnpm check-types`. Expected: clean. Only the configs and `package.json` changed.

## Implementation Log
- Implemented: 2026-10-29T10:27:07Z
- Workspace: current-branch — feat/users-filters-avatars
- Committed: no — awaiting user review
