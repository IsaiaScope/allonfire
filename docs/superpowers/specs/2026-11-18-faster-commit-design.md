# A faster pre-commit hook: no Docker race, affected only, a cache that stays on

## Intent

A commit on a Back Office change takes about ten minutes, and a failed run
costs another ten. Three causes, three fixes, none of which removes a check:

1. **The Docker race.** Every call to `packages/database/scripts/liquibase.sh`
   builds `allonfire-db-migrate` and runs the image by ID. Packages' tests run
   in parallel under Turbo and each calls the script, so one build moves the
   tag and Docker deletes the image another caller was about to run
   (`No such image: sha256:…`). It forced a serial warm-up before a commit.
2. **The hook checks too much.** `.husky/pre-commit` runs bare `pnpm check`;
   CI already passes `--affected`.
3. **The remote cache is off locally.** CI has `TURBO_TOKEN` and `TURBO_TEAM`;
   a Mac that ran `turbo login` loses the login when the token expires, and the
   hook only prints turbo's warning and carries on uncached.

## Goals

- No `No such image` failure however many packages run their tests at once.
- A commit runs Turbo's tools only for what the commit changes and the
  packages that read it.
- The remote cache is on for every hook run without a login that expires.

## Non-goals

- Dropping or reducing e2e in the hook: the full e2e stays, made cheap by
  `--affected` and the cache (decided in the brainstorm).
- Parallel e2e: more workers, CI shards, several local stacks. Out of scope;
  revisit after this lands and the hook is measured.
- Narrowing the tools Turbo does not run (lint, knip, jscpd): they keep
  reading the whole repo (`testing.md`).
- Changing what CI runs. CI keeps `--affected` against the PR's base.

## Anti-goals

- A hook that fails because the cache is unreachable or the token is missing.
- A secret in a tracked file, or in a Turbo task's declared `env` (it would
  enter the task hash).

## Constraints

- Docs outrank this file: `docs/guides/testing.md` (the hook, Stages),
  `tooling.md` (remote cache), `deployment.md` (CI), `package-layout.md`.
- Long logic lives in a file under `packages/config/local/`, not in a root
  script (`root-scripts.test.ts` caps a script at 120 characters); the hook
  stays a short list (`pre-commit.test.ts` pins it, so the test changes first).
- Tests first; a test's first line is `// @module-tag unit|integration`;
  no `as` casts but `as const`; no `JSON.parse`/`stringify`.
- exFAT drive: a new folder scan ignores `**/._*`.
- A shell script passes ShellCheck (`static:shell` covers every tracked `.sh`).

## Approaches

**Docker.** (a) Content-hash tag: the tag is `allonfire-db-migrate:<hash of the
staged context>`; the same content gives the same tag, so no caller moves a
tag to different content and no image loses its last tag mid-run, and an
existing tag skips the build. (b) A unique tag per call, removed on exit: no
pile-up, but every call still rebuilds and a crash leaves tags. (c) One build
per test run: fastest, but each package's Vitest has its own setup, so
parallel packages would still race. **Chosen: (a).** Cost: one old tag per
changelog edit; the README says how to prune.

**Affected base.** `HEAD`: only this commit's changes (the working tree counts,
checked against Turbo 2.11) plus dependents; earlier commits on a branch passed
their own hooks. `origin/dev`: what CI does, but on a long branch it is every
package every time. **Chosen: `HEAD`.** Gap, accepted: `--no-verify`, a merge
or a rebase is not re-checked by the next hook; CI still checks them.

**Cache login.** `turbo login` expires. A Vercel access token created with no
expiration, as `TURBO_TOKEN` with `TURBO_TEAM`, does not. **Chosen:** the
token, kept in the root `.env` (gitignored: `.gitignore` line 10).

## Design

**`liquibase.sh`.** After staging the context, compute a hash of it (the
files `rsync` copied, sorted by path, plus the Dockerfile) and tag the image
`allonfire-db-migrate:<hash>`. If `docker image inspect` finds the tag, skip
the build; otherwise build with that tag. Run the tag, not an ID. Two callers
with the same content build the same image and share one tag, so there is
nothing to move or delete.

**`packages/config/local/check.sh`** (new, called by the hook):

1. Read `TURBO_TOKEN` and `TURBO_TEAM` from the root `.env` the way
   `liquibase.sh` reads its `.env` (`node --env-file … --print`, never
   `source`: a `$` or `&` in a value), unless already set in the environment.
2. When either is missing, print one line ("Turbo remote cache is off: put
   TURBO_TOKEN and TURBO_TEAM in .env") and carry on; never fail.
3. Export `TURBO_SCM_BASE=HEAD`, then run `pnpm check --affected`.

`.husky/pre-commit` keeps `lint-staged`, then runs `bash
packages/config/local/check.sh`. `pnpm check` by hand stays whole-repo.

**Cache parity.** A local run can replay in CI only when the task hash is the
same. A plan step compares the two: `turbo run test:e2e --dry=json` hashes on
the Mac and the CI run summary's hash for the same commit, and the plan fixes
what differs (declared `env`, inputs) without putting a secret in either.

## Left to the builder

- The exact hash input and tool (`shasum`/`sha256sum` both exist; macOS ships
  `shasum`).
- Wording of the one-line cache notice, in the repo's message style.
- How the README documents pruning old `allonfire-db-migrate` tags.
- Where to record the measured before and after times.

## Docs and checks to change

`testing.md` (hook section), `tooling.md` (remote cache: token in `.env`),
`packages/database/README.md` (the tag and pruning), root `.env.example` (new,
`TURBO_TOKEN`, `TURBO_TEAM`, with `env-examples.test.ts` updated to list it),
`pre-commit.test.ts` (the hook's new commands). No ADR: nothing here is hard
to reverse.

## Needs from the user

Create the Vercel access token (vercel.com/account/tokens, expiration "No
Expiration", scope: the team) and put `TURBO_TOKEN=…` and `TURBO_TEAM=…` in the
root `.env`. A no-expiry token is a standing credential: if it leaks, revoke it
there; mode 600 on `.env` is the plan's check.
