# Verification Stages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every check belongs to one Stage (static, test, e2e, build) that the pre-commit hook, the root scripts and CI run by the same command, and every CI run writes a summary of what ran, why, how long, and where it failed.

**Status:** implemented (uncommitted) @ 2026-11-03T19:30:26Z; Task 6 runs at landing, once the PR's Stage checks report

**Architecture:** One stage list and one runner live in `packages/config/stages/` (config is the leaf every package reads, and it already holds `REPO`). Root scripts become stage-prefixed and call the runner for the bare stage names. The hook and each CI job call a stage command; CI's repeated plumbing becomes composite actions beside `.github/actions/setup`.

**Tech Stack:** pnpm 9 + Turbo 2.11 (read `node_modules/turbo/docs/` first, AGENTS.md; `--summarize` is in `reference/run.mdx`), tsx, Vitest, husky + lint-staged, GitHub Actions, `gh api`.

**Spec:** `docs/superpowers/specs/2026-11-03-verification-stages-design.md`

## Global Constraints

- Stages: `static`, `test`, `e2e`, `build`; `check` = `static`, `test`, `e2e` in that order (what the hook runs).
- Root script names exactly as the spec's "Root script names" table. No aliases: old names stop existing.
- Only the root `package.json` is renamed; per-package Turbo tasks (`check-types`, `test`, `test:browser`, `test:e2e`, `build`, `i18n:check`, `tailwind:check`) and `turbo.json` keep their names.
- `test` and `e2e` start only the Test services: `docker compose -f docker/docker-compose.dev.yml up -d --wait database redis storage image-server cdn`. The hook stops running `pnpm docker:up`.
- CI jobs stay parallel; only `build` has `needs: static`.
- Required checks afterwards on `dev` and `test`: `static`, `test`, `e2e`, `build`; `test` also keeps `Verify Source Branch`.
- Every check today keeps running somewhere (the spec's "Where today's checks land" table is the checklist).
- AGENTS.md: tests first, `// @module-tag unit|integration` first line, Vitest globals, no `as` casts but `as const`, one constants object per owner, no literal paths in tests (read them from `REPO`), a folder scan ignores `**/._*`.
- `packages/config/local/tests/` guards stay green (`local-files.test.ts` pins the `test` job's `DATABASE_URL`… env lines; `service-names.test.ts` and the turbo-inputs test read `.husky/pre-commit`). Config's turbo `test` inputs list every repo file a new config test reads.
- Never commit (iso-write); the branch-protection change runs only in Task 6, after the PR's new checks report.

## Review Focus

- A long-running or interactive tool in a stage (`test:ui`'s watch, a `:headed` run) would hang the hook and CI: Task 1's test asserts no stage tool contains `--watch`, `--ui` or `headed`.
- `--affected` given to a non-Turbo tool (knip, jscpd) breaks it: Task 1's test asserts it is appended only to tools marked `turbo`.
- A tool that fails with no output still has to read as a failure with a pointer: Task 1's test runs `exit 3` and expects `failed` with "(no output)".
- `GITHUB_STEP_SUMMARY` unset (every local run) must write nothing and not crash: Task 1's test runs with it unset and checks no file appears.
- The reference guard scanning folders meets exFAT `._*` sidecars and historic plans: Task 2's guard skips `._*`, `docs/superpowers/`, `docs/adr/` and `apps/laura/`.

---

### Task 1: The stage list and the runner

**Files:**
- Create: `packages/config/stages/stages.ts`, `packages/config/stages/run.ts`, `packages/config/stages/summary.ts`
- Test: `packages/config/stages/tests/stages.test.ts`, `packages/config/stages/tests/run.test.ts`, `packages/config/stages/tests/summary.test.ts`
- Modify: `packages/config/package.json` (`./stages/stages` export only if another package reads it; `tsx` devDependency), `packages/config/README.md` (structure row), `knip.jsonc` (config entry `stages/run.ts!`), `packages/config/tsconfig.json` include `stages`

**Interfaces:**
- Produces:
  - `type Tool = { name: string; run: string; why: string; turbo?: true; requires?: string }` — `run` is a shell command run from `REPO.ROOT` via `sh -c`; `requires` names a binary that, when missing, makes the tool `skipped: not installed`.
  - `STAGE: Record<StageName, readonly Tool[]>` and `CHECK = ["static", "test", "e2e"] as const`; `StageName = "static" | "test" | "e2e" | "build"` (zod enum per AGENTS.md).
  - `runStage(stage: StageName, options: { affected: boolean; keepGoing: boolean; summaryPath?: string; tools?: readonly Tool[] }): Promise<ToolResult[]>` — `tools` defaults to `STAGE[stage]`; tests pass their own.
  - `type ToolResult = { name: string; status: "passed" | "failed" | "skipped"; ms: number; reason?: string; firstLines: string[]; tests?: number; turbo?: { cached: number; ran: number } }`
  - `stageSummary(stage: StageName, results: readonly ToolResult[], run?: { url: string }): string` (Markdown)
  - CLI: `tsx packages/config/stages/run.ts <stage|check> [--affected] [--keep-going]`; exit 1 when any tool failed.

Reconciled at write time: each Stage tool is a root script, run as `pnpm -s run <script>` from `REPO.ROOT`, so every tool is runnable alone by its spec name; a tool's `name` is that script. Task 2 defines the scripts and its test checks each tool's script exists with the command below.

Stage contents (each tool's `why` is today's hook/CI comment, moved):
- `static`: `lint` (`ultracite check --error-on-warnings && oxlint --type-aware`), `types` (`turbo run check-types`, turbo), `knip`, `knip production`, `dupes`, `i18n` (`turbo run i18n:check`, turbo), `tailwind` (`turbo run tailwind:check`, turbo), `design sync` (`pnpm design:sync --check`), `shell scripts` (`shellcheck -x packages/database/liquibase/*.sh packages/database/scripts/*.sh`, requires `shellcheck`), `migrate image` (`docker build --check -f packages/database/liquibase/Dockerfile .`, requires `docker`), `workflows` (`docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.7 -color`, requires `docker`).
- `test`: `Test services` (the compose line above), `tests` (`turbo run test`, turbo), `changelog drift` (`DATABASE_URL="$(pnpm -s -C packages/database test-database template)" pnpm db:drift`).
- `e2e`: `Test services`, `browser` (`turbo run test:browser`, turbo), `e2e` (`turbo run test:e2e`, turbo).
- `build`: `build` (`turbo run build`, turbo).

- [x] **Step 1: Write the failing tests**
  - `stages.test.ts`: every tool of every stage has a non-empty `why`; no tool name contains `ui` or `headed`; `CHECK` is `["static", "test", "e2e"]`; the `test` and `e2e` stages start with `test:services`; the stages hold exactly these scripts, in order: static `static:lint, static:types, static:knip, static:knip-production, static:dupes, static:i18n, static:tailwind, static:design, static:shell, static:migrate-image, static:workflows`; test `test:services, test:run, test:drift`; e2e `test:services, e2e:browser, e2e:run`; build `build:apps`.
  - `run.test.ts` (fake tools passed as `options.tools`, not `STAGE`): tools run in order; without `keepGoing` the stage stops at the first failure and the rest are absent; with `keepGoing` every tool runs and each is reported; `exit 3` with no output gives `{ status: "failed", firstLines: ["(no output)"] }`; a tool whose `requires` binary is absent is `skipped` with `reason: "not installed"`; `affected: true` appends ` --affected --summarize` to turbo tools only; with no `summaryPath` no file is written; with one, the Markdown is appended.
  - `summary.test.ts`: `stageSummary` has one row per tool with status, duration in seconds, test count and `cached/ran` when present; a failed row is followed by its `firstLines` in a code block (at most 20 lines) and, when `run` is given, the run's link.
- [x] **Step 2: Run** `pnpm --filter @allonfire/config test stages` — expected: FAIL (modules missing).
- [x] **Step 3: Implement** `stages.ts`, `run.ts`, `summary.ts`. `runStage` spawns `sh -c` from `REPO.ROOT`, keeps the last output, times each tool, parses Vitest `Tests  N passed` and Playwright `N passed` lines into `tests`, and reads the newest `.turbo/runs/*.json` (`--summarize`) into `turbo.cached`/`turbo.ran`. It prints `▶ <stage> · <tool>` and `✔/✖/○ <tool> <s>s` per tool, and appends `stageSummary` to `summaryPath` (CI passes `$GITHUB_STEP_SUMMARY`). A `requires` check is `command -v <bin>`.
- [x] **Step 4: Run** the three tests and `pnpm --filter @allonfire/config check-types` — expected: PASS.

### Task 2: Root scripts by stage, and the reference guard

**Files:**
- Modify: `package.json` (scripts and `lint-staged` unchanged), `knip.jsonc` (comments naming `pnpm knip:production`), `packages/config/tests/vitest/vitest.config.ts`, `packages/ui/src/shared/tests/shadcn-compat.test.tsx`, `.claude/skills/aof-design/SKILL.md`, `AGENTS.md` if it names one, `docs/guides/{testing,tooling,deployment,api}.md`, every README naming an old script (find them with the guard)
- Test: `packages/config/local/tests/root-scripts.test.ts`; add the files it reads to `packages/config/turbo.json`'s `test` inputs if not already there

**Interfaces:**
- Consumes: Task 1's CLI.
- Produces: the root scripts of the spec's table; `static`, `test`, `e2e`, `build` are `tsx packages/config/stages/run.ts <stage>`, `check` is `… run.ts check`; `static:lint` keeps today's `lint` command, `static:fix` is `ultracite fix && pnpm --filter @allonfire/back-office tailwind:fix`; `e2e:run` is `turbo run test:e2e`; the rest move their current command under the new name.

- [x] **Step 1: Write the failing test** `root-scripts.test.ts`: every Stage tool's script exists in the root `package.json`, `test:services` runs exactly `docker compose -f docker/docker-compose.dev.yml up -d --wait database redis storage image-server cdn`, and no Stage tool's script contains `--watch`, `--ui` or `headed`; scan the repo's tracked `*.md`, `*.yml`, `*.json`, `*.jsonc`, `*.sh`, `*.ts`, `*.tsx` and `.husky/*` (skip `._*`, `docs/superpowers/`, `docs/adr/`, `apps/laura/`, `node_modules`) for `pnpm <name>` / `pnpm run <name>` / `pnpm -s <name>` where `<name>` is not followed by a filter flag form (`--filter`, `-C`, `-r`, `exec`, `dlx`, `install`); expect every `<name>` to be a key of the root `package.json` scripts or a pnpm built-in. Also expect the root scripts to include `static`, `test`, `e2e`, `build`, `check` and none of `lint`, `check-types`, `knip`, `dupes`, `test:browser`, `test:e2e`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/config test root-scripts` — expected: FAIL (old names present).
- [x] **Step 3: Rename** the root scripts and update every reference the test reports, in place.
- [x] **Step 4: Run** the test, then `pnpm static` and `pnpm test` — expected: PASS, each printing its per-tool lines.

### Task 3: The pre-commit hook calls the stages

**Files:**
- Modify: `.husky/pre-commit`, `docs/guides/testing.md` (the hook paragraph)
- Test: `packages/config/local/tests/pre-commit.test.ts`

**Interfaces:**
- Consumes: Task 2's `check` script.

- [x] **Step 1: Write the failing test** `pre-commit.test.ts`: the hook's non-comment lines are exactly `pnpm exec lint-staged --allow-empty` then `pnpm check`; it contains no `docker:up`, `turbo run` or `knip`.
- [x] **Step 2: Run** it — expected: FAIL.
- [x] **Step 3: Rewrite the hook** to those two lines, each with a one-line comment (lint-staged fixes the staged files; `check` runs every Stage as CI does, fail-fast). Rewrite `testing.md`'s hook paragraph to name the Stages and point at `packages/config/stages/stages.ts` for what each runs.
- [x] **Step 4: Run** the config tests (`service-names`, `local-files`, `pre-commit`) — expected: PASS. Then run `.husky/pre-commit` by hand with nothing staged (reconciled: this run stages nothing; done in Task 5) — expected: each Stage prints its tools, then exit 0.

### Task 4: CI composed of stage jobs and reusable blocks

**Files:**
- Create: `.github/actions/prepare/action.yml` (checkout stays the job's; this runs `./.github/actions/setup` then `pnpm db:generate`). The Test services start inside the `test` and `e2e` Stages (their first tool), so CI starts them exactly as a Mac does and needs no block of its own.
- Modify: `.github/workflows/ci.yml`, `docs/guides/deployment.md`, `docs/guides/tooling.md`
- Test: `packages/config/local/tests/ci-stages.test.ts`

**Interfaces:**
- Consumes: Task 2's stage scripts, Task 1's `--affected --keep-going` flags and summary.
- Produces: jobs `affected` (today's `changes`: outputs `apps`, `deploy`, `browser`; writes a summary table of affected Apps/packages and, for each Stage job that will be skipped, the reason, e.g. "e2e skipped: no App affected and no package with browser tests changed"), `static`, `test`, `e2e`, `build` (`needs: static`), each with `name:` equal to its Stage.

- [x] **Step 1: Write the failing test** `ci-stages.test.ts` (text checks, as the other workflow guards do): `ci.yml` has jobs `affected`, `static`, `test`, `e2e`, `build` and no `lint-types`, `quality`, `changes`; each Stage job's run step is `pnpm <stage> --affected --keep-going` (pnpm forwards the flags to the runner), and no step calls `knip`, `jscpd`, `turbo run`, `shellcheck` or `actionlint` directly; `build` holds `needs: static` and no other job has `needs:` but `e2e` (`needs: affected`); every job but `affected` uses `./.github/actions/prepare`; no job runs `docker compose` itself (the Stage's Test services tool does); the `test` job's env lines `local-files.test.ts` pins are still present.
- [x] **Step 2: Run** it — expected: FAIL.
- [x] **Step 3: Rewrite `ci.yml`**: keep the top `env` and `concurrency`; each job's comment sits directly above that job; Stage jobs run `pnpm <stage> --affected --keep-going` with `GITHUB_STEP_SUMMARY` inherited (the runner appends to it); `e2e` keeps Playwright's cache, install and the report artifact (`if: failure()`), and its summary names the artifact; `build` keeps its env and `environment: dev`. Update `deployment.md` (CI section: the Stage jobs, `affected`, `build` after `static`, the required checks) and `tooling.md` (knip/jscpd run in `static`).
- [x] **Step 4: Run** `ci-stages.test.ts`, the other config tests, and actionlint (`docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.7 -color`) — expected: PASS and no actionlint output.

### Task 5: Full local verification

**Files:** none new.

- [x] **Step 1:** Run `pnpm check` from a clean tree — expected: `static`, `test`, `e2e` each print every tool `✔` (or `○ … not installed` only for tools whose binary the Mac lacks) and exit 0.
- [x] **Step 2:** Run `pnpm build` — expected: exit 0.
- [x] **Step 3:** Run `GITHUB_STEP_SUMMARY=/tmp/stages-summary.md pnpm static --keep-going` and read the file — expected: one Markdown table for `static` with a row per tool, durations and statuses.
- [x] **Step 4:** Break one check on purpose (an unused export), run `pnpm static --keep-going` — expected: exit 1, every tool reported, the knip row `failed` with its first lines; restore.

### Task 6: Land it: required checks follow the new job names

Runs after the owner pushes the branch and opens the PR to `dev` (`/iso-push`), once the PR's `static`, `test`, `e2e` and `build` checks have reported green. Until then the PR waits on the old `lint-types` check, which is expected.

- [ ] **Step 1:** Read today's protection: `gh api repos/IsaiaScope/allonfire/branches/dev/protection/required_status_checks` and the same for `test` — expected: `dev` lists `lint-types`, `test`, `build`; `test` lists those plus `Verify Source Branch`.
- [ ] **Step 2:** Set `dev`: `gh api -X PATCH repos/IsaiaScope/allonfire/branches/dev/protection/required_status_checks -F strict=<the value Step 1 printed> -f 'contexts[]=static' -f 'contexts[]=test' -f 'contexts[]=e2e' -f 'contexts[]=build'` (`strict` unchanged). Set `test` the same plus `contexts[]=Verify Source Branch`.
- [ ] **Step 3:** Re-read both — expected: exactly those contexts; the PR shows every required check satisfied.

## Documentation checked

- [x] `AGENTS.md`: Turbo's installed docs read (`node_modules/turbo/docs/reference/run.mdx`, `--summarize`); tests first with `// @module-tag`; no literal paths in tests (`REPO`); a folder scan ignores `._*` (the reference guard, the runner's Turbo runs folder, actionlint's `[!.]*.yml`).
- [x] `docs/guides/testing.md`: the hook paragraph now describes the Stages; the CI pointers name the `static` and `test` Stages.
- [x] `docs/guides/deployment.md`: CI as Stage jobs, `affected`, `build` after `static`, the required checks.
- [x] `docs/guides/tooling.md`, `api.md`, `design-system.md`, `.claude/skills/aof-design/SKILL.md`, `knip.jsonc`: renamed scripts.
- [x] `packages/config/README.md`: the `stages/` folder and the Stage scripts.
- [x] `CONTEXT.md`: **Stage** and **Test services** (written during planning).
- [x] `biome.jsonc`: `process.env` only under `**/scripts/**`, so the CLI is `stages/scripts/stage.ts` and the runner `stages/run.ts`.

## Implementation Log
- Implemented: 2026-11-03T19:30:26Z
- Workspace: current-branch — feat/instant-users-navigation
- Committed: no — awaiting user review
- Verified: `pnpm check` (static 11 tools, test 3, e2e 3) exit 0; `pnpm build` exit 0; the summary table with Turbo's cache counts under `--affected`; a planted unused export fails `static:knip` and `static:knip-production` with their first lines while every other tool still reports; actionlint clean.
- Left: Task 6 (branch protection on `dev` and `test`), after `/iso-push` opens the PR and its `static`, `test`, `e2e`, `build` checks are green. Until then the PR waits on the old `lint-types` check.

