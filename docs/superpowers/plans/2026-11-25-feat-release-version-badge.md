# Package versions in releases, and the version badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every workspace package's `package.json` version moves in the `/iso-push` release commit when the package changed, and Laura and the Back Office show their own version (`v0.12.0`) on a secondary badge at the left of the account menu's last row.

**Architecture:** A repo script in core computes, from the release range's changed files and the `package.json` workspace graph, which packages changed (libraries: own files; Deploy units: own files or any workspace dependency, transitively), and rewrites only their `"version"` line by the Release's kind. A repo hook `.iso/release-hook` runs it; a few lines in the global `/iso-push` release step call that hook inside the release worktree and `git add` what it changed, so the unit versions land in the same `chore(release)` PR. Each App passes its own version through `AppDescriptor.version` to ui's `AOFAccount`, which hands it to `AOFAccountMenu`'s badge.

**Tech Stack:** TypeScript (Node, `tsx`), Vitest (unit, integration, browser), the `pnpm-workspace.yaml` package list, bash (`push.sh`, `push.test.sh`), React 19 Server and Client Components, Base UI through `AOFDropdownMenu`.

**Spec:** `docs/superpowers/specs/2026-11-25-package-versions-in-releases-design.md` (and the **Release** term in `CONTEXT.md`). Read both first.

## Global Constraints

- Only the `"version"` line of a `package.json` changes (text edit); never `npm version` per package, never a rewrite of the file (a lint rule on field order once shipped red on dev).
- A Deploy unit is `apps/api`, `apps/laura`, `apps/back-office` and `packages/database` (the migration); every other workspace package is a library (`auth-old` and `ui-old` included).
- One bump kind per Release, taken from the previous and the new repo version (`major`, `minor`, `patch`); below 1.0 a breaking change is a minor (the skill already does that; the script only copies the kind).
- Aligned once to `0.12.0` (the repo's current release) for every package; afterwards no package is ahead of the repo's version.
- The release worktree has no `node_modules`: the script reads `package.json` files only (no turbo, no install).
- The badge: `v` plus the App's own version, secondary `AOFBadge`, `font-mono`, not a menu item, no translation; none when `version` is not given.
- A package never imports an App: each App imports its own `package.json` (`with { type: "json" }`, as `apps/api/src/features/logger/logger.ts` does) and puts it in its descriptor.
- Repo rules: no `as` casts except `as const`; no `JSON.parse/stringify`, `Object.keys/values/entries/fromEntries` (core's helpers); constants one nested object per owner; no string-literal paths; tests first, first line `// @module-tag unit|integration`, Vitest globals; Biome's `useTopLevelRegex`; Laura copy says "image".
- The global skill (`~/.claude/skills/iso-push`) is outside this repo's git: edit it, test it with its own `push.test.sh`, and tell the owner to commit it where it lives. Never commit or stage anything in this repo (the owner commits with `/iso-commit`); other threads' staged and unstaged work stays untouched (`CONTEXT.md`, `package.json` and guides carry other hunks).
- Guides: `docs/guides/package-layout.md`, `testing.md`, `code-style.md`, `conventions.md`, `design-system.md`, `laura.md`, `back-office.md`, `deployment.md`; `next-apps.md` (descriptor and frame).

## Review Focus

1. **The release worktree has no `node_modules`.** The graph comes from `package.json` files, so Task 1 pins its answer against `turbo query affected` on a real range (one integration test), and Task 3 runs the hook in a detached worktree.
2. **A package must not bump twice for one range, nor bump itself next time.** The range starts at the last release commit (`VERSION`'s last change) and the release commit is its own boundary; Task 2 pins "a range with only a release commit changes nothing".
3. **A hook that fails must stop the release before any commit**, not leave a half release; Task 3 pins it in `push.test.sh`. No hook file means today's behaviour, byte for byte.
4. **Unit rebuild after a release.** A release commit edits each affected unit's own `package.json`, which makes exactly those units rebuild on it; a unit the release did not touch keeps its old version. Verify on the next deploy (not run here).
5. **Different numbers are expected:** Laura can read `v0.14.0` while the Back Office reads `v0.13.2` after a Release that only touched Laura. Task 4's guide line says so.
6. **A long version** (`v10.12.345`) must not push Sign out out of the 20rem popup. Task 4 pins the row at 320 px.
7. **A library going from `2.0.0` to `0.12.0`** in the alignment is a downgrade by design; nothing reads a library's number, so Task 5 pins "no package ahead of the repo" and nothing else.

---

### Task 1: Which packages changed, and their next number (core, pure)

**Files:**
- Create: `packages/core/src/features/ci/release-versions.ts`, `packages/core/src/features/ci/tests/release-versions.test.ts`
- Modify: `packages/core/package.json` (export key `./features/ci/release-versions`)

**Interfaces:**
- Produces: `type WorkspacePackage = { dependencies: readonly string[]; name: string; path: string; unit: boolean; version: string }` (`dependencies`: workspace package names it lists, across `dependencies` and `devDependencies`); `bumpVersion(current: string, kind: ReleaseKind): string`; `releaseKind(previous: string, next: string): ReleaseKind` with `ReleaseKind = "major" | "minor" | "patch"` (zod enum, `releaseKindSchema`); `changedPackages(packages: readonly WorkspacePackage[], changedFiles: readonly string[]): WorkspacePackage[]` (a library: a changed file under its `path/`; a unit: itself or any transitive dependency changed); `setVersion(packageJson: string, version: string): string` (replaces only the first top-level `"version"` line, keeps everything else byte for byte, throws when none).

- [ ] **Step 1: Failing tests** (`release-versions.test.ts`): `bumpVersion("0.12.0","minor")` is `"0.13.0"`, `("0.12.3","patch")` `"0.12.4"`, `("1.2.3","major")` `"2.0.0"`; `releaseKind("0.12.0","0.13.0")` is `minor`, `("0.12.0","0.12.1")` `patch`, `("0.12.0","1.0.0")` `major`, equal versions throw; `setVersion` changes `"version": "1.0.0"` to `"version": "0.12.0"` in a sample file and leaves the other lines and the final newline identical, and throws for a file with no version; `changedPackages`: a changed file in a library marks only that library; a changed file in a library a unit depends on (two levels deep) marks the unit; a changed file in the unit's own folder marks only it; a change in an unrelated library marks nothing; a changed root file (`package.json`, `VERSION`, a doc) marks nothing; no package is returned twice.
- [ ] **Step 2:** `pnpm --filter @allonfire/core exec vitest run src/features/ci/tests/release-versions.test.ts`; expect FAIL.
- [ ] **Step 3:** implement the five exports in `release-versions.ts` (arithmetic on three integers; a regex at module level for the version line; a visited set for the transitive walk) and the export key.
- [ ] **Step 4:** rerun, `tsc --noEmit`, `pnpm exec biome check packages/core/src/features/ci`; expect PASS.

### Task 2: The script that rewrites the versions

**Files:**
- Create: `packages/core/src/features/ci/apply-release-versions.ts` (CLI), `packages/core/src/features/ci/tests/apply-release-versions.integration.test.ts`
- Modify: root `package.json` (script `ci:release-versions`: `pnpm --filter @allonfire/core exec tsx src/features/ci/apply-release-versions.ts`), `packages/core/package.json` if the CLI needs an export key.

**Interfaces:**
- Consumes: Task 1's functions.
- Produces: the CLI `ci:release-versions --root <dir> --previous <X.Y.Z> --next <X.Y.Z> --from <ref>` (reads the workspace folders listed in `pnpm-workspace.yaml` under `<root>`, the changed files from `git -C <root> diff --name-only <from>..HEAD`, bumps each `changedPackages` entry by `releaseKind(previous, next)`, prints one changed `package.json` path per line, relative to the root) and `--align <X.Y.Z>` (sets every workspace package to that version, prints the changed paths).

- [ ] **Step 1: Failing integration tests** in a temp git repository with a tiny workspace (an app depending on two libraries, one unrelated library): after a commit that touches one library, the CLI with `--previous 0.12.0 --next 0.13.0` bumps that library, the app, and nothing else; a range whose only commit changes `VERSION` and the root `package.json` changes nothing and prints nothing; `--align 0.12.0` sets all four packages and prints four paths; only the `"version"` line differs in each file (compare with `git diff -U0`); an invalid `--next` fails with a non-zero exit and writes nothing.
- [ ] **Step 2:** run it; expect FAIL.
- [ ] **Step 3:** implement the CLI (arguments through `node:util` `parseArgs`, as `print-affected.ts` and `cli.ts` do; workspace folders from `pnpm-workspace.yaml` globs `apps/*` and `packages/*` expanded with `node:fs`; a unit is `apps/*` plus `packages/database`, named once in a constant).
- [ ] **Step 4:** the **sanity test** (integration, reads this repo): on the real range `3faa8c11^..3faa8c11` (the commit that landed Laura's gallery) the script's changed units equal the Deploy units `pnpm ci:affected` lists for the same range, minus any difference explained in a comment (the Image-file rule); expect PASS or an explained, asserted difference.
- [ ] **Step 5:** rerun everything, `tsc --noEmit`, Biome.

### Task 3: The hook in the repo and in `/iso-push`

**Files:**
- Create: `.iso/release-hook` (repo, executable, a few lines of shell)
- Modify (outside the repo): `~/.claude/skills/iso-push/scripts/push.sh` (`cmd_release`), `~/.claude/skills/iso-push/scripts/push.test.sh`, `~/.claude/skills/iso-push/SKILL.md` (one paragraph in the Release step)

**Interfaces:**
- Hook contract: `.iso/release-hook <previous> <next> <range-from-sha>`, executable, run with the release worktree as its working directory after `VERSION` and the root `package.json` are written and before the commit; it prints one changed path per line (relative to the worktree) and exits 0, or exits non-zero to stop the release. The skill `git add`s every printed path. No hook file: nothing runs.
- The repo hook runs `pnpm ci:release-versions` against the worktree; because the worktree has no `node_modules`, it calls the CLI from the main checkout (`--root "$PWD"`) or, if the builder finds that unreliable, through `node --experimental-strip-types` on the TypeScript file (Node 24; the CLI imports only `node:` modules and zod-free code, so it needs no install). Pick one, state it in the file.

- [ ] **Step 1: Failing shell tests** in `push.test.sh`, in its own style: a release in a scratch repo with a hook that edits `apps/a/package.json` and prints it puts that file in the release commit; a hook that exits 1 aborts the release with no commit, no PR and no tag; a repo with no hook releases exactly as before (compare the commit's file list).
- [ ] **Step 2:** run `bash ~/.claude/skills/iso-push/scripts/push.test.sh`; expect the three new cases to FAIL.
- [ ] **Step 3:** implement the hook call in `cmd_release` right after the `npm version` block (`previous` is the version read from `origin/$base:VERSION` before it is overwritten, `range-from` is `last_release origin/$base`), and the paragraph in `SKILL.md`; write `.iso/release-hook` in the repo.
- [ ] **Step 4:** the new cases pass and the whole file stays green; run the repo hook by hand in a detached worktree of `origin/dev` with a fake `--next` and read the diff (then remove the worktree).
- [ ] **Step 5:** tell the owner the skill files changed outside the repo.

### Task 4: Each App passes its version, the menu shows the badge

**Files:**
- Modify: `packages/ui/src/features/navigation/types/app-descriptor.ts` (`version: string`), `packages/ui/src/features/navigation/components/aof-account.tsx` (`app: Pick<AppDescriptor, "app" | "version">`, `version={app.version}`), `packages/ui/src/features/navigation/components/aof-account-menu.tsx` (optional `version?: string | undefined`, last row `div.flex.items-center.justify-between.gap-2`: an `AOFBadge` `variant="secondary"` with `className="ml-1.5 font-mono"` showing `` `v${version}` ``, then the Sign out item with `ml-auto w-fit`), `apps/laura/src/shared/constants/laura.ts` and `apps/back-office/src/shared/constants/back-office.ts` (the descriptors: `version: pkg.version` from the App's own `package.json`), the places that build a descriptor in tests
- Test: `packages/ui/src/features/navigation/tests/aof-account-menu.browser.test.tsx`, `.../aof-account.test.tsx`, a test per App (`apps/laura/src/shared/tests/`, `apps/back-office/src/shared/tests/`)

**Interfaces:**
- Produces: `AppDescriptor.version: string` (no `v`); `AOFAccountMenuProps.version?: string | undefined`.

- [ ] **Step 1: Failing tests.** Browser: with `version="7.8.9"` the text `v7.8.9` is visible, its box ends at or before Sign out's left edge and shares its row; no `menuitem` carries the badge's name; with no version no `v\d+.\d+.\d+` text shows and Sign out is still visible; at 320 px a long `10.12.345` keeps Sign out inside the popup. Unit: `AOFAccount` gives the menu `props.version` equal to its `app.version`. Per App: `LAURA.version` and `BACK_OFFICE.version` equal that App's `package.json` `version` (import it in the test).
- [ ] **Step 2:** run them; expect FAIL.
- [ ] **Step 3:** implement as listed.
- [ ] **Step 4:** `pnpm --filter @allonfire/ui exec vitest run src/features/navigation/tests/aof-account.test.tsx`, the browser file with `pnpm --filter @allonfire/ui test:browser` (Chromium and WebKit), the Apps' unit tests; `tsc --noEmit` in ui, Laura, Back Office; Biome.
- [ ] **Step 5: See it.** In the owner's Chrome tab on the dev server (`localhost:3200`, never a new window, `/iso-browser`) open the account menu in the dark and the light theme and at a phone width; the owner signs in (never type their credentials) or a throwaway User is made in the Back Office with the owner's session. Do not stop the owner's dev servers.

### Task 5: Align once, and keep it true

**Files:**
- Modify: every workspace `package.json` (the `"version"` line only, through `pnpm ci:release-versions --align 0.12.0`)
- Create: `packages/core/src/features/ci/tests/package-versions.integration.test.ts`
- Modify: `docs/guides/deployment.md` (the Release and the hook), `docs/guides/laura.md`, `docs/guides/back-office.md` (the badge, one clause each), `docs/guides/package-layout.md` (a package's version moves only in a Release)

- [ ] **Step 1: Failing test** `package-versions.integration.test.ts`: every workspace `package.json` version is `major.minor.patch`; none is ahead of the root `package.json` version.
- [ ] **Step 2:** run it; expect FAIL (`ui` and `auth` say `2.0.0`).
- [ ] **Step 3:** run `pnpm ci:release-versions --root . --align 0.12.0`; `git diff -U0` shows only version lines across the thirteen package files.
- [ ] **Step 4:** the test passes; write the guide lines; the **documentation review** (`/iso-write` step 3): read the guides above against the change and fix any rule it breaks, test first.
- [ ] **Step 5: Final run:** `pnpm static:lint`, `pnpm exec biome check`, `pnpm static:knip`, `pnpm static:dupes`; `tsc --noEmit` in core, ui, laura and back-office; unit, browser and integration suites of core and ui, the Apps' unit suites; `bash ~/.claude/skills/iso-push/scripts/push.test.sh`. Expected: green except failures another session owns (report, do not chase).
- [ ] **Step 6:** tick the plan, stamp it as `/iso-write` says, stop. Nothing is committed or staged.

## Implementation Log

(Filled by `/iso-write`: the sanity test's result, the hook's final form, the screenshots taken.)
