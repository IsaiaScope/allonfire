# Verification stages: one set of commands for the hook, the root scripts and CI

Status: design, agreed with the owner in chat on 2026-11-03.

## Intent

The checks that guard a change have grown one at a time, in three places that
no longer read alike:

- **The root `package.json`** has 37 scripts. The checking ones (`lint`,
  `check-types`, `knip`, `knip:production`, `dupes`, `i18n:check`,
  `tailwind:check`, `test`, `test:unit`, `test:integration`, `test:browser`,
  `test:e2e`, their `:headed`/`:ui` variants, `test:coverage`, `test:ui`) are
  flat names with no grouping.
- **The pre-commit hook** (`.husky/pre-commit`) is a dozen raw commands with
  their reasons as comments: lint-staged, oxlint, knip ×2 and jscpd, the Local
  stack, `turbo run check-types test test:browser`, then `turbo run test:e2e`.
- **CI** (`.github/workflows/ci.yml`) has six parallel jobs (`changes`,
  `lint-types`, `quality`, `test`, `e2e`, `build`) that each repeat checkout,
  setup and Prisma generate. `lint-types` hides seven different checks. Three
  job comments sit above the wrong job (`changes`' above `lint-types`,
  `quality`'s above `test`, `e2e`'s above `build`), left behind when the jobs
  were reordered. A run tells you a job went red, not what ran, why something
  was skipped, how long each part took or where the failure is.

The owner finds CI hard to follow and wants "more information in general and
modularity, to have a clear vision of what is going on".

## Goals

1. **Stages are the unit.** Every check belongs to exactly one stage. A stage
   is one root command that runs the same on a Mac, in the pre-commit hook and
   in CI, so local and CI cannot drift.
2. **Scripts are grouped by stage in their names** (owner): the stage name is
   the prefix, the bare prefix runs the whole stage, a prefixed name runs one
   tool.
3. **CI is modular at two levels** (owner: "both"): each CI job calls a stage
   command, and the repeated plumbing (checkout, setup, Prisma generate, the
   Test services) is reusable blocks that `ci.yml` composes.
4. **Every CI run explains itself** (owner, all four): a run summary on
   GitHub's job summary page saying
   - what ran and why, including what was skipped and the reason
     ("e2e skipped: no App affected");
   - each stage's result: pass/fail, test counts, Turbo tasks replayed from
     cache vs run;
   - each stage's duration;
   - on failure: the failing command, its first error lines, and the link to
     the artifact (the Playwright report).
5. **CI jobs stay parallel** (owner): the stages are clearer, not serialized.
6. **The pre-commit hook still runs every stage** (owner: "all stages, as
   now"), as calls to the stage commands; each stage prints a header, its
   result and its time, so a red commit says which stage broke.

## Non-goals

- Renaming the per-package Turbo tasks (`check-types`, `test`, `test:browser`,
  `test:e2e`, `build`, `i18n:check`, `tailwind:check`) or `turbo.json`'s task
  graph (owner: "root only"). Turbo, the packages and their own scripts keep
  their names; only the root's names change.
- Changing what any check checks, or adding a new check.
- Changing `deploy.yml`'s behaviour or `ci-branch-gate.yml`'s rule. Either may
  reuse a new block where it already repeats the same plumbing; nothing it
  does changes.
- Moving e2e out of the hook or adding a pre-push hook.

## Anti-goals (a failure even if it works)

- A stage command that does something different in CI than locally (beyond
  `--affected` and where its report goes).
- CI or the hook calling a raw tool directly when a stage command covers it:
  that is the drift this design removes.
- A summary that is a wall of log: it must be readable at a glance.
- Losing a check on the way (every current hook step and CI step maps to a
  stage; the map below is the checklist).

## The stages (decided)

| stage | bare command runs | tools inside (each its own `stage:tool` script) | hook | CI job |
|---|---|---|---|---|
| `static` | every static check | lint (Biome), oxlint, types (`check-types`), knip, knip production, dupes (jscpd), i18n, Tailwind classes, design copies in sync, shell scripts, migrate-image build checks, workflows (actionlint) | yes | `static` |
| `test` | unit and integration tests, the Test services up first, then the changelog-vs-Prisma drift check | unit, integration, coverage, the Vitest UI | yes | `test` |
| `e2e` | browser tests, then end-to-end | browser (+ headed), e2e (+ headed, UI) | yes | `e2e` |
| `build` | the Apps' production builds | — | no (e2e already builds the App it tests) | `build` |
| — | `pnpm check` runs `static`, `test`, `e2e` in order: what the hook runs | | | |

Naming (owner): the stage is the prefix. `pnpm static` runs the stage,
`pnpm static:knip` one tool; `pnpm test` / `pnpm test:unit`; `pnpm e2e` /
`pnpm e2e:browser`, `pnpm e2e:headed`; `pnpm build`; `pnpm check` all of the
hook's stages. Every tool script stays runnable on its own (owner: "keep
every tool script"); it is renamed under its stage. Scripts that are not
checks (`dev*`, `db:*`, `docker:*`, `design:sync`, `env:prod`, `ci:affected`,
`prepare`) keep their names.

Where today's checks land, so none is lost:

| today | stage |
|---|---|
| hook: lint-staged (Tailwind canonicalize + Biome on staged files) | `static` (the staged-files form stays the hook's; `static:lint` checks the repo) |
| hook: `oxlint --type-aware` | `static` |
| hook: knip, knip production, dupes | `static` |
| hook: `docker:up` + `compose up --wait …` | `test` and `e2e`: the targeted `compose up --wait` only (see Decided) |
| hook: `turbo run check-types test test:browser` | `static` (types), `test`, `e2e` (browser) |
| hook: `turbo run test:e2e` | `e2e` |
| CI `lint-types`: types, lint, design sync, i18n + Tailwind, ShellCheck, migrate image check, actionlint | `static` |
| CI `quality`: knip ×2, dupes | `static` |
| CI `test`: Test services, tests, changelog drift | `test` |
| CI `e2e`: Test services, Playwright install, browser + e2e, report artifact | `e2e` |
| CI `build`: builds | `build` |
| CI `changes`: affected Apps, browser output | the reusable "what is affected" block; every job's summary reads it |

## Decided by the owner

- CI and the hook both call stage commands, and CI is composed of reusable
  blocks ("both").
- The run summary carries all four kinds of information.
- CI jobs stay parallel.
- The hook keeps running every stage it runs today.
- Tool scripts are kept and prefixed by their stage; the bare prefix runs the
  stage; only the root `package.json` is renamed.
- **Required checks:** the plan updates branch protection itself through
  `gh api`, ordered around the PR that renames the jobs (today `dev` requires
  `lint-types`, `test`, `build`; `test` requires those plus
  `Verify Source Branch`). Afterwards both branches require `static`, `test`,
  `e2e` and `build` (a skipped `e2e` counts as passing); `test` keeps
  `Verify Source Branch`. `static` now carries knip and jscpd, so they become
  required too.
- **`build` waits for `static`** (`needs: static`): it is the only job given
  the real `dev` secrets, so they reach only code that passed the static
  checks, and a red PR spends no build minutes. Every other job stays
  parallel.
- **The Test services, everywhere:** the `test` and `e2e` stages start only
  what tests need, `database redis storage image-server cdn` with `--wait`,
  on a Mac, in the hook and in CI. The hook stops running `pnpm docker:up`
  (the whole dev stack with telemetry, analytics, workflow and the one-shot
  inits); tests never read the inits' output (`storage-init`'s `image`
  bucket and `database-init`'s analytics/workflow databases serve `pnpm dev`
  only). `pnpm dev` and `pnpm docker:up` still start everything.

## Decided in grilling (owner, 2026-11-03)

- **No aliases.** Renamed root scripts drop their old names; the change
  updates every in-repo reference (guides, `AGENTS.md`, `.claude/skills`,
  READMEs, `ci.yml`, the hook, `knip.jsonc`, configs and tests that name a
  script), and a guard test fails when a doc or config names a root script
  that does not exist. The owner adjusts global skills outside the repo.
- **The hook runs both:** lint-staged first (it writes fixes on the staged
  files), then the full `static` stage exactly as CI runs it, repo-wide Biome
  included.
- **Vocabulary** (`CONTEXT.md`): **Stage** (static, test, e2e, build) and
  **Test services** (the five Local services a test run starts). Docs, step
  names and the runner use those words; "Local stack" stays the whole stack.

## Root script names (owner, 2026-11-03)

| today | new |
|---|---|
| `lint` | `static:lint` |
| `lint:fix` | `static:fix` (Biome fixes and Tailwind canonicalize) |
| `check-types` | `static:types` |
| `knip` / `knip:production` | `static:knip` / `static:knip-production` |
| `dupes` | `static:dupes` |
| `i18n:check` / `tailwind:check` | `static:i18n` / `static:tailwind` |
| `test` | `test`, now the whole stage: Test services up, unit and integration, changelog drift |
| `test:unit`, `test:integration`, `test:coverage`, `test:ui` | unchanged |
| `test:browser` / `test:browser:headed` | `e2e:browser` / `e2e:browser:headed` |
| `test:e2e` / `test:e2e:headed` / `test:e2e:ui` | `e2e:run` / `e2e:headed` / `e2e:ui` |
| — | new: `static`, `e2e`, `build` (the stage), `check` (static, test, e2e: the hook) |

## The builder's calls (not discussed; flagged so the owner can check them)

- **One stage runner.** A small script (under `packages/config` or `scripts/`,
  the builder's choice within `docs/guides/package-layout.md`) takes a stage
  name and `--affected`, runs that stage's tools in order, prints a header,
  result and duration per tool, and, when `GITHUB_STEP_SUMMARY` is set,
  appends the same as Markdown there. The stage's tool list lives in one
  place, read by the runner, so the hook, `pnpm check` and CI cannot list
  different tools. Each tool's reason, today a comment in the hook or
  `ci.yml`, moves next to its entry in that list.
- **Fail-fast inside a stage, not across CI.** Locally a stage stops at its
  first failing tool (the hook should fail fast); in CI a stage runs every
  tool and reports all of them, so one red job shows every broken check. A
  flag selects it.
- **`--affected` in CI only.** CI passes `--affected` to the Turbo-backed
  tools as today; locally Turbo's cache does the same job.
- **Tools that need something a Mac may lack** (ShellCheck, actionlint's
  image, `docker build --check`) run in `static` when the tool is present and
  are reported "skipped: not installed" otherwise; CI always has them, so CI
  never skips them.
- **The "why skipped" line** comes from the same affected data `changes`
  computes today: the reusable block writes it once, each job reads it.
- **Reusable blocks** are composite actions beside today's
  `.github/actions/setup`: `prepare` (setup plus Prisma generate) for every
  Stage job. The Test services start inside the `test` and `e2e` Stages
  themselves, so CI starts them exactly as a Mac does and needs no block.
- **Check names** on a PR read as the stage (`static`, `test`, `e2e`,
  `build`), each job's `name:` set accordingly.

## Constraints

- `AGENTS.md`: Turbo's installed docs (`docs/README.md` in the `turbo`
  package) before changing Turbo config or commands; owner-prefixed env vars;
  constants per owner; no literal paths in tests.
- `docs/guides/testing.md` describes the hook and the CI jobs;
  `docs/guides/deployment.md` and `tooling.md` describe CI, `--affected`, the
  remote cache and knip/jscpd. Each is updated to the stages, once, and the
  others point there.
- `packages/config/local/tests/` holds exact-text guards over CI and the hook
  (`local-files.test.ts`, `service-names.test.ts`, `workflows.test.ts`): they
  move with the files they read and stay green.
- actionlint stays clean; the pre-commit hook and CI both pass on the branch
  that makes the change.
- The exFAT `._*` sidecars: a new tool that scans folders ignores them.

## Left to the builder

- The runner's exact language and file layout, its output format, and how it
  parses each tool's counts (Vitest, Playwright, Turbo's cache summary).
- Which reusable blocks are worth extracting beyond setup, Prisma generate
  and starting the Test services.
- The exact Markdown of the job summary, within the four kinds of
  information above.
