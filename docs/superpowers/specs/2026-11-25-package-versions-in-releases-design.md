# Every package carries its own version, and each App shows it

Date: 2026-11-25. Status: agreed in chat (brainstorm and grill), a small project: one script, one hook line in a global skill, one descriptor field and a badge.

## Intent and why

The owner asked for the released version on a badge at the left of the account menu's last row, in both Apps. Looking for what to show, we found the repo has one version (`VERSION` and the root `package.json`, cut by `/iso-push` after every landing on `dev`) while every workspace package says `1.0.0` or `2.0.0`, so the API reports a wrong `service.version` to telemetry and nothing says which code a Deploy unit runs. The owner said `/iso-push` is right for the repo and asked whether the per-package `package.json` files can carry the version. They can, and the Release term in `CONTEXT.md` now says how.

## Goals

- Each workspace package's `package.json` `version` moves only in a Release: a **Deploy unit** (the API, Laura, the Back Office, `@allonfire/database` for the migration) when anything it is built from changed (turbo's affected idea: its own files or any workspace package it depends on, transitively); a **library** (core, ui, auth, design, shadcn, storage, config, the two `-old` ones) only when its own files changed.
- The bump kind is the Release's own (the same `major`/`minor`/`patch` `/iso-push` picks from the commit subjects; below 1.0 a breaking change is a minor); every changed package gets that kind.
- It lands in the same `chore(release): X.Y.Z` commit and PR that `/iso-push` already builds, so the number a deploy reads is the number the Release made.
- One-time alignment: every package starts at the repo's current release (`0.12.0`), libraries included (`ui` goes down from `2.0.0`).
- Laura and the Back Office show their own version: `v0.12.0` on a secondary badge at the left of the account menu's last row, Sign out at the right. The API's telemetry reads its own `package.json` as it already does, and is right with no code change.

## Non-goals

- No per-unit commit scopes or a release tool (Changesets, release-please); the kind is one per Release.
- No change to how the repo version, the tag or the cascade (dev, test, prod) work.
- No commit hash on the badge (asked, declined: "release only").
- A package's version is not a resource's Version (the save check) and not an image tag; the images stay tagged by commit.

## Anti-goals

- A badge that says one release behind the code in dev (the release commit lands after the feature commit). The release commit changes each affected unit's own `package.json`, so those units rebuild on it; a unit the release did not touch keeps the number it was built with, which is the point.
- The global skill gaining monorepo knowledge: it only runs a repo script when one exists.

## Constraints

- `~/.claude/skills/iso-push/scripts/push.sh` is global, outside this repo's git: the hook change is described in the plan, tested in `push.test.sh`, and the owner commits it elsewhere.
- The release worktree is detached with no `node_modules`: the script reads the workspace graph from the `package.json` files (`workspace:` dependencies), not from turbo, so it needs no install.
- `npm version` is not used per package (workspace specs and a lint rule on `package.json` field order once shipped red): only the `"version"` line changes, text-edited.
- A package never imports an App: each App passes its own version (`AppDescriptor.version`, from its own `package.json` import as `apps/api` does for its logger).
- Repo rules: no `as` casts, no `JSON.parse/stringify` (core's helpers), constants one nested object per owner, tests first with `// @module-tag`, guides `package-layout.md`, `testing.md`, `code-style.md`, `conventions.md`, `design-system.md`.

## Approaches

| | Trade-off |
|---|---|
| A. Repo version on the badge (root `package.json`) | one constant and no skill change; but every App says the repo's number even if nothing in it changed, and the API's telemetry stays wrong |
| B. Repo version plus the build's commit | truthful about what runs, needs Docker build args; the owner kept the release alone |
| **C'. Per-package versions in the release commit (picked)** | each number means "this package changed in this Release"; fixes telemetry; costs a repo script and a hook in a global skill |
| D. A tool with per-unit scopes (Changesets, release-please) | the proper per-unit release flow; heavy for one maintainer and replaces `/iso-push`'s versioning |

Picked by the owner: **per unit, only when it changed**, aligned once to `0.12.0`, a repo script run by a small hook in `/iso-push`, every workspace package, own files for libraries and affected for Deploy units.

## Left to the builder

- The hook's name and place (my call: `.iso/release-hook`, executable, run in the release worktree as `<previous> <next> <range-from-sha>`, printing the paths it changed so the skill `git add`s them).
- Whether the static workspace-graph affected rule needs a sanity check against `turbo query affected` on a real range (my call: yes, one integration test).
- What to do with the `-old` packages (my call: treat them as libraries like the rest).
