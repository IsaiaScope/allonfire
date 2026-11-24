# A Faster Pre-Commit Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** implemented (uncommitted) @ 2026-11-18T16:55:00+01:00; open: Task 2 step 8 (the token, yours) and Task 3 steps 1, 3, 4 (need the token and a PR)

**Goal:** A commit stops losing runs to the Docker image race, runs Turbo's tools only for what the commit changes, and always has the remote cache on.

**Architecture:** `liquibase.sh` tags the db-migrate image by a hash of its build context, so parallel callers share one tag instead of moving it. A new `packages/config/local/check.sh` loads `TURBO_TOKEN`/`TURBO_TEAM` from the root `.env`, sets `TURBO_SCM_BASE=HEAD` and runs `pnpm check --affected`; the hook calls it. A last task checks that a local run's task hash equals CI's.

**Tech Stack:** bash (ShellCheck-clean), Docker, Turbo 2.11 (`--affected`, remote cache), Vitest (text and behavior tests).

**Spec:** `docs/superpowers/specs/2026-11-18-faster-commit-design.md`

## Global Constraints

- Docs read first: `docs/guides/testing.md`, `tooling.md`, `conventions.md`, `package-layout.md`, `packages/database/README.md`; Turbo's installed docs (`node_modules/.pnpm/turbo@2.11.11/node_modules/turbo/docs`) before touching `turbo.json` or a Turbo flag (`AGENTS.md`).
- Tests first. A test file's first line is `// @module-tag unit` (or `integration`); Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`; never `JSON.parse`/`JSON.stringify`/`Object.keys|values|entries|fromEntries`: use core's helpers.
- Long logic lives in a file under `packages/config/local/`; a root script stays at most 120 characters (`root-scripts.test.ts`).
- Read a `.env` the way `liquibase.sh` does (`node --env-file=… --print`), never `source` it: a `$` or `&` in a value breaks it.
- A secret is never a tracked file and never a Turbo task's declared `env` (it would enter the task hash).
- exFAT drive: a new folder scan ignores `**/._*`.
- The word "may" is not written in docs or replies; use "can", "is allowed to" or "might".
- No commit in this plan: the tree stays uncommitted for the user (`/iso-commit`).

## Review Focus

- A token containing `$`, `&`, `=` or quotes in `.env` arrives in `TURBO_TOKEN` unchanged (Task 2).
- No `.env`, or only one of the two keys: one notice line, the check still runs, exit 0 (Task 2).
- A failing `pnpm check` makes `check.sh` exit non-zero, so the hook still blocks the commit (Task 2).
- Six callers of `liquibase.sh` at once all succeed, and a repeat run with unchanged content adds no image tag (Task 1).
- `.env` stays gitignored and `.env.example` stays tracked (Task 2).

---

### Task 1: Content-hash tag in `liquibase.sh`

**Files:**
- Modify: `packages/database/scripts/liquibase.sh` (the `image=$(docker build …)` block, lines ~34-37, and the final `docker run … "$image"`)
- Test: `packages/database/liquibase/tests/liquibase-script.test.ts` (unit, new)
- Test: `packages/database/liquibase/tests/migrate-image.integration.test.ts` (integration, new)
- Modify: `packages/database/README.md` (the line under the commands table, "every `db:*` Liquibase script builds the same `db-migrate` image")

**Interfaces:**
- Produces: the image reference `allonfire-db-migrate:<12-hex-chars>` where the hash covers every file copied into the staging `$context` (sorted by path, `LC_ALL=C`) and the Dockerfile; `docker image inspect <ref>` succeeding means the build is skipped. The script's arguments, env and output are unchanged.

- [x] **Step 1: Write the failing unit test** in `liquibase-script.test.ts`, exact-text like `preview.test.ts` (read `scripts/liquibase.sh` with `readFileSync`). Tests: `it("tags the image by its content, not a fixed name")` expects the text to contain `allonfire-db-migrate:` followed by a variable and not to match `--tag allonfire-db-migrate \` ; `it("skips the build when the tag exists")` expects `docker image inspect`; `it("runs the image by its tag")` expects the `docker run` line to end with the tag variable, and the text not to contain `docker build --quiet`.
- [x] **Step 2: Write the failing integration test** in `migrate-image.integration.test.ts`: `it("runs six callers at once without losing the image")` makes a throwaway database with the helpers in `./throwaway-db` (`throwawayName`, `throwawayUrl`, `recreateDatabase`, `dropDatabase`, as `changelog.integration.test.ts` does), runs six `migrateImage(url, [], "status")` calls concurrently with `execFile`-based promises (a tiny async wrapper, `Promise.all`), and expects all six to resolve. A second test, `it("adds no image tag when the content is unchanged")`, lists `docker images --filter reference=allonfire-db-migrate --format {{.Tag}}` before and after one more run and expects equal lists. Use `TEST_DATABASE.DOCKER_TIMEOUT_MS` as the timeout.
- [x] **Step 3: Run both** `pnpm --filter @allonfire/database exec vitest run liquibase/tests/liquibase-script.test.ts liquibase/tests/migrate-image.integration.test.ts` (Test services up: `pnpm test:services`). Expected: the unit test FAILS on the old text; the integration test is probabilistic on the old script (it often fails with `No such image`), so a pass here is not proof; the unit test is.
- [x] **Step 4: Implement** in `liquibase.sh`: after the `rsync`, compute `hash` (12 hex chars) over the staged files sorted by path plus the Dockerfile (`shasum` ships on macOS, `sha256sum` on Linux: use whichever exists, `shasum -a 256` first), set `image="allonfire-db-migrate:$hash"`, run `docker build --quiet --tag "$image" --file … "$context" >/dev/null` only when `docker image inspect "$image" >/dev/null 2>&1` fails, and `docker run … "$image" "$@"` as today. Replace the old "By ID, not by tag" comment with one saying why the tag is content-addressed (same content, same tag: nothing to move, nothing to delete). The script stays ShellCheck-clean.
- [x] **Step 5: Run both tests again**, then `pnpm static:shell`. Expected: PASS, no ShellCheck output.
- [x] **Step 6: README**: in the sentence after the commands table, say the image is tagged by a hash of its content, an unchanged changelog reuses it, and old tags are removed with `docker image prune -a --filter reference='allonfire-db-migrate'` (check the exact flag against `docker image prune --help` before writing it).

### Task 2: `check.sh`, the hook, and the cache token

**Files:**
- Create: `packages/config/local/check.sh`
- Create: `.env.example` (root: `TURBO_TEAM=`, `TURBO_TOKEN=`, a comment saying where the token comes from and that the file stays local)
- Modify: `.husky/pre-commit` (the last command)
- Modify: `packages/config/local/tests/pre-commit.test.ts`, `packages/config/local/tests/env-examples.test.ts`
- Test: `packages/config/local/tests/check.test.ts` (unit, new)
- Modify: `docs/guides/testing.md` (the hook paragraph, ~lines 92-95), `docs/guides/tooling.md` (the remote cache bullet, line ~47)

**Interfaces:**
- Produces: `bash packages/config/local/check.sh [env-file]`: `env-file` defaults to the repo's root `.env`. It exits with `pnpm check --affected`'s status. It runs `pnpm check --affected` with `TURBO_SCM_BASE=HEAD`, `TURBO_TOKEN` and `TURBO_TEAM` exported when both are known (an already-set environment value wins over the file), and otherwise prints one stderr line starting `Turbo remote cache is off:` and naming both variables, then still runs.

- [x] **Step 1: Write the failing `check.test.ts`.** A helper makes a temp dir holding a fake `pnpm` (a shell script that writes `$TURBO_SCM_BASE`, `$TURBO_TOKEN`, `$TURBO_TEAM` and `"$@"` on separate lines to a file and exits with the status in a `FAKE_PNPM_EXIT` env var, default 0) and runs `bash check.sh <envfile>` through `execFileSync` with `PATH` = that dir first, `cwd` = the repo root, and a clean env (no `TURBO_*`). Tests: `it("runs pnpm check --affected from HEAD")` (args are `check --affected`, base is `HEAD`); `it("hands pnpm the token and team from the file")`; `it("keeps a token with $, & and = whole")` (a file line `TURBO_TOKEN=a$b&c=d`); `it("prefers values already in the environment")`; `it("says the cache is off and still runs when a key is missing")` (no file; stderr contains `Turbo remote cache is off:` and both names; fake pnpm was called; status 0); `it("exits with the check's status")` (`FAKE_PNPM_EXIT=1` gives a non-zero status). One more: `it("keeps .env out of git and .env.example in")` runs `git check-ignore -q .env` (status 0) and `git check-ignore -q .env.example` (status 1).
- [x] **Step 2: Update the pinned tests first.** `pre-commit.test.ts`: the expected commands become `["pnpm exec lint-staged --allow-empty", "bash packages/config/local/check.sh"]`. `env-examples.test.ts`: add an `OWNERS` entry `[".env.example", () => ["TURBO_TEAM", "TURBO_TOKEN"]]`.
- [x] **Step 3: Run** `pnpm --filter @allonfire/config exec vitest run local/tests/check.test.ts local/tests/pre-commit.test.ts local/tests/env-examples.test.ts`. Expected: FAIL (no script, no example, old hook).
- [x] **Step 4: Implement `check.sh`** (header comment in the style of `dev.sh`): `set -euo pipefail`; the repo root from `BASH_SOURCE`; read the two keys with `node --env-file="$env_file" --print 'process.env.TURBO_TOKEN ?? ""'` (skip when the file is absent or the variable is already set); export both when non-empty, else print the notice; `export TURBO_SCM_BASE=HEAD`; `exec pnpm check --affected`.
- [x] **Step 5: Hook and example.** `.husky/pre-commit` ends with `bash packages/config/local/check.sh` and its comment says the hook narrows Turbo's tools to this commit (`--affected` against `HEAD`) and loads the cache token from `.env`. Write `.env.example`.
- [x] **Step 6: Run the step 3 command again**, then `pnpm static:shell` and `pnpm exec ultracite check`. Expected: PASS, clean.
- [x] **Step 7: Docs.** `testing.md`: the hook runs lint-staged then `check.sh`, which runs `pnpm check --affected` against `HEAD`, so a commit checks what it changes and its dependents (CI still diffs against the PR's base; `pnpm check` by hand stays whole-repo); a `--no-verify`, merge or rebase is left to CI. `tooling.md`: replace the `turbo login`/`turbo link` advice with the token flow (a Vercel access token created with no expiration, `TURBO_TOKEN` and `TURBO_TEAM` in the root `.env`, the hook prints one line when they are missing, revoke the token on Vercel if it leaks, `chmod 600 .env`).
- [ ] **Step 8: User step.** The user creates the token (vercel.com/account/tokens, expiration "No Expiration", the team's scope) and writes both keys into `.env`. Without them the hook still works, uncached.

### Task 3: Check the speed-up and the cache parity

**Files:**
- Modify: `docs/guides/tooling.md` (one line: what a local run's cache hit depends on), `turbo.json` only if the check below finds a real difference.

**Interfaces:**
- Consumes: Task 1 (no race) and Task 2 (`check.sh`, the token in `.env`).

- [ ] **Step 1: Measure.** From a clean tree, time `bash packages/config/local/check.sh` three ways: a docs-only change (expect a few seconds of Turbo work), a change in one package, a change in `apps/back-office` (full e2e). Record the three times and the `Cached: n cached` lines. The first line of the output must show `Remote caching enabled`.
- [x] **Step 2: Race check.** Run `pnpm run test --concurrency=10` (every package at once) twice. Expected: no `No such image` in either log.
- [ ] **Step 3: Parity.** With a PR open (the user pushes it: `/iso-push`), take the `test:e2e` hash of `@allonfire/back-office` from CI's run summary and from `pnpm exec turbo run test:e2e --affected --dry=json` on the same commit (`TURBO_SCM_BASE=origin/dev`). Equal: write the one line in `tooling.md` saying a local pass replays in CI. Different: `--dry=json` shows each hashed input and env; remove the difference with the smallest change to `turbo.json` (`inputs` excluding a local-only file, or an `env` that CI sets too), never by hashing a secret; add the matching assertion to `packages/config/local/tests/workflows.test.ts` or the nearest existing `turbo.json` test.
- [ ] **Step 4: Report** the three times, the race result and the parity result in the final message (not in a file).

## Implementation Log
- Implemented: 2026-11-18T16:55:00+01:00
- Workspace: current-branch — feat/laura-p0-drop
- Committed: no — awaiting user review
- Race check: `turbo run test --concurrency=10 --force --continue` (database, api, auth, storage) twice, no `No such image`, 251/251 database tests
- Cleaned: stale `allonfire-db-migrate:latest` tag, my temp sandboxes and logs; `check.test.ts` now removes its sandbox
- Left alone: `allonfire_test_*` databases (the `pnpm dev` vitest watch), `design` test failing on another session's ocean export
