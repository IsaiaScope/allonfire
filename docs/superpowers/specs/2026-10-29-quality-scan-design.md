# Quality scan of the workspace

## Intent

The owner wants to confirm the project holds a certain quality before more
features land on it (Edit User, phone landscape, and the rest). The way to
confirm it is a scan of every file the workspace builds. It produces a report
the owner reads and picks fixes from. The scan itself changes no product code.

## Goals

- Read **every** file in scope, not a sample, and check it against two
  yardsticks:
  1. **Written rules**: `AGENTS.md`, `.claude/CLAUDE.md` (Ultracite), the
     guides in `docs/agents/*.md` and the ADRs in `docs/adr/`.
  2. **Clean-code judgement**, where the written rules are silent.
  Every finding names which yardstick it breaks, and for a written rule, the
  rule and its file.
- Six kinds of finding:
  - **repetition**: copy-paste, or two shapes of the same thing;
  - **missed reuse**: a helper, constant or AOF component already exists and
    the code rebuilds it;
  - **structure**: off `src/{environment,shared,features}`, a constant
    outside its owner's nested object, a literal path or error code, an env
    var without its owner prefix, a package importing an App, a bare
    `Object.*`/`JSON.*`/storage call instead of core's helpers, an `as` cast;
  - **error handling**: a swallowed error, a catch that hides the cause, a
    failure that never reaches the user or the log, a missing problem
    document;
  - **dead code**: unused files, exports, dependencies, branches, constants,
    translations;
  - **clarity**: code harder to read than it needs to be.
- Test code is in scope with the same eye: repeated setup, fixtures or stubs
  written twice, dead helpers.
- Add **knip** (unused files, exports, dependencies; about 22M downloads a
  week) and **jscpd** (duplicated blocks; about 3.9M a week) as root dev
  dependencies. Each gets a config and a root script, so the checks can run
  again later.
- One report: `docs/superpowers/specs/2026-10-29-quality-scan-report.md`.
  - One section per App or package; every finding carries `file:line`, its
    kind, its yardstick and a fix size (S, M or L).
  - It ends with a ranked shortlist of what to fix first.

## Non-goals

- Fixing anything. The fixes come in a later plan, built from the findings
  the owner picks.
- CI or pre-commit gating for knip or jscpd. That comes after the fixes,
  otherwise CI is red on day one.
- Performance and security audits, and bug hunting for its own sake. A
  correctness bug found on the way is listed, but nobody goes looking for one.
- Reviewing design and taste in the UI. That belongs to `/aof-design`.

## Anti-goals

The report fails if it is either of these:

- **Noise.** Hundreds of nits, or findings nobody verified. Every listed
  finding has been re-read at its `file:line` and confirmed by someone other
  than the agent that raised it. Taste-only items are left out unless they
  cost real reading time.
- **Shallow.** Only the tools' output, or a sample of the files. Every file
  in scope is read, and the report states the file count per section so
  coverage can be checked.

## Scope

- In:
  - `apps/api` and `apps/back-office`;
  - `packages/auth`, `config`, `core`, `database`, `design`, `storage`, `ui`;
  - root config and scripts: `package.json`, `turbo.json`, `.husky/`,
    `.github/workflows/`, `docker/`.
- Out:
  - `apps/laura`, already outside the pnpm workspace while it is paused
    (ADR 0010);
  - `packages/auth-old` and `packages/ui-old`, git-ignored and used only by
    Laura;
  - `packages/shadcn`, written only by the shadcn CLI. knip loads it, and
    only unused components are reported (see the calls below);
  - generated files (Prisma client, `.next`, `tsbuildinfo`) and macOS `._*`
    sidecars.
- **Laura-only code is listed apart.** Laura is outside the workspace, but it
  still imports `@allonfire/storage`, `@allonfire/database` (with
  `features/laura/*` and `game-score.service`), `@allonfire/auth/guard`,
  `@allonfire/core` and `@allonfire/ui`. Code whose only consumer is Laura is
  never reported as dead. It gets its own section, "Held only by Laura", so
  the owner can see how much that is. To find it, grep `apps/laura` for
  imports of in-scope packages. knip does not do this.
- **The tree as it stands**, not HEAD (owner's call). The uncommitted Edit
  User work is read too, and every finding in it is marked "in progress".
  The report records the commit it was taken against and notes that
  in-progress `file:line`s move.

## Constraints

- New npm dependencies pass the 200k weekly-download rule; both do.
- knip and jscpd ignore `**/._*` (exFAT sidecars, AGENTS.md).
- Their configs honour the workspace's real entry points: Next routes, Hono
  `index.ts`, the package `exports` maps, Vitest and Playwright configs, the
  Liquibase and seed CLIs. A knip run that lists live code as dead is a
  config bug, fixed before the findings are trusted.
- Nothing is committed; the owner runs `/iso-commit`.

## Decided by the owner

- Report first; fixes later.
- Both yardsticks: written rules first, judgement second, and every finding
  says which.
- Tools join the repo as scripts, with no CI gate yet.
- The report is Markdown in `docs/superpowers/specs/`.
- Tests are scanned too.
- "Read every file, but list only verified findings worth fixing."

## Calls made in writing this up (the owner can overrule them)

- **An exported subpath that no App, script or config imports is dead.**
  knip's entries are the Apps, the CLIs and the test configs, not every
  `exports` map entry. Otherwise a package's unused export could never show
  up.
- **When code and a written rule disagree, the finding can be the rule.** If
  most of the codebase does one thing and a guide or ADR says another, the
  finding is "rule outdated" against that doc and lists the files that
  follow the other way. It is not one finding per file. So `AGENTS.md`,
  `docs/agents/*.md` and the ADRs are in scope for those findings only.
- **Unused shadcn components are reported** as dead code, with the fix
  "remove through the shadcn CLI". The files are never edited by hand.
  Nothing else inside `packages/shadcn` is reported.

## Run shape (owner's call)

1. **Area readers.** About eight agents, one per App or package (`api`,
   `back-office`, `auth`, `config` with the root config, `core`, `database`,
   `design`, `storage`, `ui`; the small ones can pair up). Each reads every
   file in its area and returns two things:
   - its findings;
   - an **inventory**: every helper, constant, type, component and test
     stub or fixture it found, each with a one-line purpose.
2. **jscpd** runs over the whole workspace in one pass, so it also catches
   copy-paste *between* Apps and packages.
3. **A cross-package reader** compares the inventories and the jscpd
   output. It looks for:
   - code that does the same job in two places but is written differently
     (two link builders, two delete-then-log helpers, two stubs);
   - code that belongs one level up, in `core`, `ui` or a package's
     `shared/`.
4. **Verifiers.** One per area's findings, plus one for the cross-package
   findings. Each re-reads every finding at its `file:line` and drops
   anything that doesn't hold.

## Rules to write

The report ends with a **"Rules to write"** section. Where the same
judgement finding recurs across files and no written rule covers it, the
report proposes a one-line rule and the guide in `docs/agents/` that should
hold it. Nothing goes into the guides until the owner picks.

## Left to the builder

- How the reading is split across agents, and how findings get verified.
  An independent second read of each finding is the floor.
- The exact knip and jscpd settings. For jscpd: a threshold that catches real
  copy-paste without flagging imports or JSX boilerplate.
- The report's ranking, by cost to a maintainer: repetition and missed reuse
  that touch several Apps rank above local clarity.
