# Laura Phase 7: Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nothing of the old world survives (untracked `auth-old` and `ui-old`, old Laura files and assets, Laura's Viewer logic, Quiz, the pause wording), the two Apps are proved to share one scaffold by tests, the docs say what is true, and Laura is a Production service with a backup, a deploy order, a smoke checklist and a release check.

**Architecture:** Phase 7 adds no feature. It adds guard tests in `packages/config/local/tests` (read as text, `git ls-files`, like the existing ones) that make each claim of "cutover" a failing test first, then does the deletions, doc rewrites and deploy wiring that turn them green. Production wiring is one more service in the existing Dokploy compose project (`docker/docker-compose.prod.yml`), not a new Dokploy application.

**Tech Stack:** Vitest (unit, integration), `git ls-files`, jscpd, knip, Docker compose, GitHub Actions, Liquibase (`db-migrate` image), Playwright (acceptance). No new dependency.

**Spec:** docs/superpowers/specs/2026-11-17-laura-rebuild-design.md (Phase 7, decision 9 and 10, "Parity rule", "Anti-goals")

## Global Constraints

- Tests first. A test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`. A constant's type comes from zod (`xSchema = z.enum(X)`, `type X = z.infer<typeof xSchema>`); a lookup table is `as const satisfies Record<K, V>`.
- Never `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify`, `localStorage`/`sessionStorage`: use core's helpers (`packages/config` imports nothing, core included: its tests use arrays, `Map` and text).
- Constants are one nested object per owner. A path or an error code is never a string literal, tests included (a guard test that names a path to check it is the one place a path is a literal, as `package-exports.test.ts` does). A Tailwind class list is never a constant.
- An env var starts with its owner: `STORAGE_`, `DATABASE_`, `AUTH_`, `API_`. The two new compose keys are `LAURA_HOST` and `LAURA_URL`, named like `BACK_OFFICE_HOST` and `BACK_OFFICE_URL`.
- A package never imports an App. Files go in `src/{environment,shared,features}`.
- Database changes are Liquibase changesets, never `prisma db push` or `prisma migrate`; this phase adds none (a changeset is never edited once applied).
- exFAT drive: macOS writes `._*` sidecars; every scan this phase writes ignores `**/._*`; a tar made on the Mac uses `COPYFILE_DISABLE=1`.
- Docs are plain English prose, no emoji, never the word "may" (use can / is allowed to / might); `docs/guides/writing.md`: guides hold only what lives nowhere else, one pointer per fact, end with `## History and gotchas`.
- Do not commit and do not push (the owner commits by hand, one branch and PR to `dev`); a deletion of an untracked folder is irreversible, so each one waits for the owner's yes (`AskUserQuestion`, same turn) and offers a tar first.
- Never read or print a `.env.production` value; production values move only through `pnpm env:prod` (`deployment.md`).

## Review Focus

1. **A leftover that no gate names.** Untracked folders on disk (`auth-old`, `ui-old`, `seed-photos`, `test-results`, a 5.5 GB stale `.next`), a config line about them (root `vitest.config.ts` and `.oxlintrc.json` are not touched by Phase 3), a word in a doc or a skill. Pinned by `old-world-gone.test.ts` (Tasks 1, 2) and `old-words-gone.test.ts` (Task 3), which fail by file and line.
2. **The Apps drift apart again.** A binding file in one App and not the other, a Laura file that re-implements a package piece instead of importing it, a new `jscpd:ignore` block. Pinned by `app-scaffold-shape.test.ts` (Task 5) and `pnpm static:dupes`.
3. **An audit row that names nothing real.** `replaced` with a `replaced by` that is prose or a renamed export. Pinned by the new resolver cases in `laura-parity-audit.test.ts` (Task 4).
4. **A Production deploy that fails or half works.** `LAURA_HOST` or `LAURA_URL` unset (compose refuses, by design), the API's `API_CORS_ORIGINS` lacking Laura's origin (Better Auth answers `INVALID_ORIGIN` at Sign in), no `laura` image because the unit was not built, a request body above what Cloudflare lets through. Pinned by `prod-compose.test.ts` (Task 8) and the checklist of Task 11.
5. **One-way data and a half-promoted rebuild.** Changesets `0008` (Laura Viewers to Users), `0009` (Favorite) and Phase 6's (the QUIZ enum value) cannot give their data back (in Production only `0009`'s table starts empty and `laura."GameScore"` holds 0 rows, so nothing real is lost today, but the changesets still run on a database that is not empty tomorrow); promoting Phases 3 to 6 to `prod` before Phase 7 would show the Back Office switcher a link to a Laura host that still answers 404. Pinned by the order and rollback section below, the schema round-trip test (Task 9) and the restore point step (Task 11).
6. **A VPS that is not what the inventory says.** `docs/superpowers/specs/2026-11-17-laura-vps-cleanup-inventory.md` (a live read-only audit, run on 2026-11-17) found no old Laura container, image, volume, network, Traefik route, env key, Redis key, MinIO bucket or GitHub secret on the VPS, so this plan deletes nothing there. Risks: the inventory is stale by the time of the promotion, someone deletes a thing the new Laura needs (`laura.` DNS, `auth`, `laura.GameScore`, `laura.Favorite`, objects of the `image` bucket, `LAURA_*` keys), or the owner's own hand tasks run before the photos are uploaded. Pinned by Task 10 (re-check, expected `none`, and the KEEP list) and Task 12 (the "photos migrated" gate).

---

## Decisions this plan takes (correctable)

- **Phase 3 already moved most "leftovers" work; Phase 7 verifies and finishes the rest.** Read from the Phase 3 plan: it empties `apps/laura/src`, deletes `messages/`, `public/**` (but `favicon.ico`), `scripts/`, `e2e/login.spec.ts`, rewrites the README, `.env.example`, `package.json`, drops the `!apps/laura` pause from `pnpm-workspace.yaml`, `biome.jsonc`, `.oxlintrc.json`, adds Laura to `knip.jsonc`, `.jscpd.json`, CI, the Dockerfile arg and `deploy.yml`, and writes the parity audit and its test. Phase 6 states the same files as "left for Phase 7" (messages, card-back PNGs, three dependencies): those are already gone by Phase 3, so this plan checks them with tests instead of deleting them twice.
- **Left to this phase, found by reading the repo** (Phase 3's plan lists none of these): root `vitest.config.ts` (a `!apps/laura/**` project negation, a coverage exclude, `!packages/auth-old/**`, `!packages/ui-old/**`, three comments naming the pause); `.oxlintrc.json` (`packages/*-old/**` and the comment); `.gitignore` lines 69 to 71 (`auth-old`, `ui-old`); `.jscpd.json` ignore entries; `packages/core/src/features/errors/format-error-message.ts` (its only reader was Laura's quiz admin; `knip.jsonc` accepts it as "Held only by Laura"); `docs/screenshots/laura-{games,quiz,settings}.png` and their mobile twins; `.claude/commands/allonfire-deploy.md` (an `apps/laura/src/features/games/.../quiz-form.tsx` example), `.claude/skills/aof-documentation/**` (Laura screenshot inventory, `:3200`, Framer Motion), `.claude/skills/aof-design/SKILL.md` line 180 and `docs/guides/code-style.md` line 21 (both tell a builder to use Framer Motion, which no package uses after Phase 6); ADR pointers; Production hosting.
- **Production hosting is one compose service, not a Dokploy application.** `deployment.md`: "Dokploy runs one compose project of GHCR images". Laura's Dokploy work is two env keys (`LAURA_HOST`, `LAURA_URL`) and the redeploy `deploy.yml` already makes; the Traefik labels carry the host. `laura.isaiariva.com` already exists, proxied, answering 404 (`docs/guides/vps.md`; the owner's `TODO.md`): verify, do not create.
- **Promote once.** Phases 0 to 7 each land on `dev` (a PR and a release each, below); `test` and `prod` get one cascade after Phase 7 lands, so Production never runs a Back Office that links to a Laura that is not there, and the three one-way changesets deploy together behind one backup. Phase 0 and 1 alone are safe to promote earlier if the owner wants.
- **No new ADR.** ADR 0032 and 0033 hold the decisions. ADRs 0010, 0017, 0021 and 0001 get one pointer line each (Task 6); the old text stays as history, like ADR 0014's pointer.
- **The old Laura is already gone from the VPS, so this plan deletes nothing there.** The owner's launch notes (`docs/superpowers/plans/2026-10-29-chore-production-launch.md`, Task 9) say Laura's tables, bucket and image went at launch with no dump, and the live read-only audit of 2026-11-17 (`docs/superpowers/specs/2026-11-17-laura-vps-cleanup-inventory.md`, written by the coordinator through `/hetzner-ssh`, not re-run by this plan's author) confirms it: no Laura container, image, volume, network, Traefik route, env key, Redis key, MinIO bucket or GitHub secret; Storage holds `image` and `telemetry` only. Left on the VPS and all needed: the `laura` schema (`GameScore`, 0 rows, its enum still has `QUIZ`: Phase 6's changeset drops that value, no row to delete), the `laura.` DNS record, one Laura `auth."Membership"` row (the Admin's), no `VIEWER` row, no `image."ImageApp"` row (no Image is stored: **the Gallery is empty after the first deploy until the owner uploads**, Task 11 step 4 and Task 12). So Phase 7 has no VPS delete task; it has a re-check that the inventory is still true (Task 10), the KEEP list, and three owner hand tasks (Task 12). What is left to delete is on this Mac: the Local MinIO `laura` bucket (75 MB, verified with `docker exec allonfire-storage sh -c 'du -sh /data/*'`, beside `image` 7.4 MB) and `apps/laura/seed-photos/` (492 MB, 172 JPEGs, the curated set the old seed script read). Both are the owner's real photos: they are deleted only after the owner has uploaded what he wants through Laura's Upload Section (Task 12, behind the "photos migrated" gate), and only on his yes.
- **What must NOT be deleted, anywhere** (Task 10 pins it as a list the re-check prints back): objects of the shared `image` bucket (old Laura photos that live there belong to the Gallery); the `auth` schema; `laura."GameScore"` and `laura."Favorite"` (and the `laura` schema); the `laura.` Cloudflare record; the `LAURA_HOST` and `LAURA_URL` Production keys and secret; `dokploy-postgres`, `dokploy-redis`, the `monorepoonfire` application and database; the `allonfire-db-backups` and `storage_data` volumes.
- **No backup task of its own, no delete-class tasks.** The coordinator asked for them while a VPS cleanup was expected; the inventory made them empty. The restore point the one-way changesets need stays Task 11 step 2 (`db-backup` is the first deploy service, `vps-backups.md` holds the restore drill).
- **`formatErrorMessage` is deleted**, not kept: no App or package reads it once `quiz-admin.ts` is gone (`git grep -w formatErrorMessage -- apps packages`, verified: only the old quiz admin and core's own README).
- **The scaffold-shape test compares file names and package imports, not source text**; jscpd already compares text. It lives in `packages/config/local/tests` because config reads files as text and imports nothing.

## Parity rule: what this phase reuses

No page is built here, so no TanStack, private cache, image or skeleton mechanism is touched. The parity rule is enforced instead: `app-scaffold-shape.test.ts` fails when a Laura binding stops importing the same `@allonfire/{ui,core,auth}` piece the Back Office binding imports, and when a package piece one App needs is missing from the other. The Laura guide (Task 6) names, per page, which Back Office mechanism it reuses (a pointer to `next-apps.md`, never a copy), and `laura-guide.test.ts` pins every route and API path it names.

## Merge order, blocking and rollback

Each phase is its own branch and PR to `dev` (spec: "Branches"), cut by `/iso-write` from an up-to-date `dev`. Every landing on `dev` also cuts a version through `/iso-push` (Task 13). Order, with what each blocks:

| Phase | Needs merged first | Blocks | Database | Revert undoes | One-way |
|---|---|---|---|---|---|
| 0 Drop Viewer | none | 1 (reads `Role` as it then is), everything | `0008` Laura Viewers to Users (data only, the enum stays) | Laura's floor, guards, tests, glossary | The data: a revert never knows which Users were Viewers |
| 1 Extract scaffold | 0 | 2, 3 and all later | none | the whole move (git renames) | none |
| 2 Ocean Design | 1 | 3 | none | Design files, Laura's `EMAIL.LOOK` entry | none |
| 3 Laura shell | 1, 2 | 4, 5, 6, 7 | none | workspace re-entry, lockfile, Dockerfile arg, `LAURA_URL` required in the Back Office compose | none; but its CI needs GitHub secret `LAURA_URL` (`dev`) before it lands |
| 4 Gallery and Favorites | 3 | 5, 6 (shared pieces `useAOFLinkRefresh`, `aofAltFor`, `GALLERY.CACHE.TAG`, `invalidateGallery`) | `0009` `laura."Favorite"` | the feed, the routes, core's `invalidateStatic` | Favorites rows (rollback drops the table) |
| 5 Admin Upload | 3, 4 | 7 | none | `AOFAddImages` and the Back Office's Add Images move | none |
| 6 Memory game | 3, 4 | 7 | `00NN` Memory-only `GameScore` (named by `pnpm db:changeset` after 0009) | the game and its routes | QUIZ rows and unrankable rows (deleted, never restored) |
| 7 Cutover | 0 to 6 | the promotion to `test` and `prod` | none | the deletions of tracked files and the deploy wiring | untracked folders deleted from this Mac |

Rules that follow. Cut a changeset only after the previous one merged, so the numbers stay `0008`, `0009`, `0010` (a clash is renumbered before merging, never after). Phases 5 and 6 can merge in either order and both touch the same few files (Laura's constants, translations, `apps/api/src/app.ts`): the later one reconciles. After a revert of a DB phase's code, `pnpm test:drift` fails until the changeset is rolled back or fixed forward: `docker compose -f docker/docker-compose.prod.yml run --rm db-migrate rollback-count --count=<N>` (or `rollback --tag=<last deployed version>`) from the compose directory on the VPS (`packages/database/README.md`, Production), then redeploy the matching image. When the three changesets deploy together, `rollback --tag=v<last deployed>` undoes all three: the tag is the root `package.json` version at the last deploy that applied something. A rollback restores structure, never data: the restore point for data is the `db-backup` dump taken at the start of the deploy (Task 11).

## File structure

Created: `docs/superpowers/specs/2026-11-17-laura-vps-cleanup-inventory.md` already exists (the coordinator's audit, untracked); Task 10 appends a dated "Re-check" section to it and edits nothing above it. Tests:

- `packages/config/local/tests/old-world-gone.test.ts` (Tasks 1, 2): old packages, pause lines, old Laura files, old assets.
- `packages/config/local/tests/old-words-gone.test.ts` (Task 3): the grep gates, with a reasoned allowlist.
- `packages/config/local/tests/app-scaffold-shape.test.ts` (Task 5): the two Apps' scaffold files and package imports, the jscpd guard.
- `apps/laura/src/shared/tests/laura-guide.test.ts` and `apps/api/src/features/docs/tests/laura-guide.test.ts` (Task 6): the Laura guide names only things that exist.

Modified (by task): Task 1 `pnpm-workspace.yaml`, `.gitignore`, `.jscpd.json`, `vitest.config.ts`, `.oxlintrc.json`, `packages/auth/README.md`; Task 2 `knip.jsonc`, `packages/core/{package.json,README.md}`, `packages/config/local/tests/{package-exports,knip-config,env-examples,root-scripts}.test.ts` (only to confirm Phase 3 and 6's edits); Task 4 `packages/config/local/tests/laura-parity-audit.test.ts` and the audit; Task 6 `CONTEXT.md`, `AGENTS.md`, `docs/guides/*`, four ADRs, `.claude/commands/allonfire-deploy.md`, `.claude/skills/aof-{design,documentation}/**`; Task 7 `README.md`, `apps/laura/README.md`, `docs/screenshots/*`, `docs/assets/allonfire-laura-horizontal.svg`; Task 8 `docker/docker-compose.prod.yml`, `docker/.env.example`, `.github/workflows/deploy.yml` (verify only), `packages/config/local/tests/{prod-compose,env-production,local-files}.test.ts`, `docs/guides/{deployment,vps}.md`, `README.md` deploy section; Task 9 `packages/database/liquibase/tests/changelog.integration.test.ts`; Task 10 the inventory (append only); the doc lines that still say Laura is out of Production or waits for a rebuild are edited in Task 8 (`docs/guides/deployment.md` lines 10 and 33, `docs/guides/vps.md` line 32, `docker/docker-compose.prod.yml` line 74): `vps-other-apps.md`, `vps-backups.md`, `vps-workflow.md` and `vps-agent.md` name Laura nowhere (`git grep -n -i laura -- docs/guides/vps*.md` prints only `vps.md` line 32), so they stay as they are.

Deleted: `packages/auth-old/`, `packages/ui-old/` (untracked), `apps/laura/{seed-photos,test-results,.next,tsconfig.tsbuildinfo}` (ignored, on disk), `packages/core/src/features/errors/format-error-message.ts`, six old screenshots.

---

### Task 0: Reconcile and baseline

**Files:** none; notes only.

**Interfaces:** Consumes every name earlier phases fixed.

- [ ] Step 1: Check Phases 0 to 6 landed (stop and name the phase when a line prints nothing, or when the last two print anything): `ls packages/database/changelog/changesets | tail -4` (shows `0008-drop-viewer-role.sql`, `0009-laura-favorite.sql`, Phase 6's); `git grep -l "export type AppDescriptor" -- packages/ui/src`; `ls packages/design/src/designs packages/design/src/apps` (`japan ocean`, `back-office laura`); `ls docs/superpowers/specs/2026-11-17-laura-parity-audit.md packages/config/local/tests/laura-parity-audit.test.ts packages/config/local/tests/laura-app.test.ts`; `git grep -l "keysetCursor" -- packages/core/src`; `git grep -l "withImageUploads" -- packages/storage/src`; `git grep -l "MEMORY_RULE" -- packages/database/src`; `git grep -n "GameType\|QUIZ" -- packages/database/prisma apps/api/src`; `git grep -n "Role.VIEWER" -- apps packages`.
- [ ] Step 2: Reconcile: re-read what this plan edits, as the earlier phases left it (`git log -5 --format=%h\ %s -- <path>` for each): `knip.jsonc`, `vitest.config.ts`, `.oxlintrc.json`, `pnpm-workspace.yaml`, `.jscpd.json`, `docker/docker-compose.prod.yml`, `docker/.env.example`, `docs/guides/{laura,next-apps,package-layout,tooling,deployment,vps,testing,images,design-system,code-style,back-office}.md`, `CONTEXT.md`, `AGENTS.md`, `apps/laura/README.md`.
- [ ] Step 3: Baseline, pass counts in the notes (a red is fixed or reported first): `pnpm static`, `pnpm test:services && pnpm test:run`, `pnpm test:drift`, `pnpm e2e:browser`, `pnpm e2e:run`. (`pnpm check` runs the three Stages in order and is the pre-commit hook; use it when Docker and Playwright browsers are ready.)
- [ ] Step 4: Inventory what only this Mac holds, for the owner's gates: `du -sh packages/auth-old packages/ui-old apps/laura/seed-photos apps/laura/test-results apps/laura/.next` (verified when written: 56M, 77M, 492M, 2.0M, 5.5G) and `git clean -ndX -- packages/auth-old packages/ui-old apps/laura` (a dry run; it also lists `apps/laura/.env`, `node_modules`, `.turbo`, `next-env.d.ts`: those are not deleted here).

### Task 1: Delete `auth-old` and `ui-old` and every line about them

**Files:**
- Delete: `packages/auth-old/`, `packages/ui-old/` (untracked and gitignored, verified: `git ls-files packages/auth-old packages/ui-old | wc -l` is 0, `git check-ignore -v` names `.gitignore:70` and `:71`; neither is in `pnpm-lock.yaml`)
- Modify: `pnpm-workspace.yaml` (the two `!packages/*-old` lines), `.gitignore` (the comment and the two lines), `.jscpd.json` (two `ignore` entries), `vitest.config.ts` (`projects` negations for both, the coverage exclude of `apps/laura/**` and the three comments naming the pause or the old packages), `.oxlintrc.json` (`packages/*-old/**`, `apps/laura/**` if Phase 3 left it, and the comment), `packages/auth/README.md` (the paragraph "Laura still uses the old Next-bound package in `packages/auth-old`")
- Test: create `packages/config/local/tests/old-world-gone.test.ts` (unit)
- Verified clean already (the test pins it): no `tsconfig` path, `knip.jsonc` entry, `lint-staged` line, `turbo.json` task, workflow or Dockerfile names either folder (`git grep -n "auth-old\|ui-old" -- . ':!docs/superpowers'` lists only the files above, ADR 0010 and `docs/guides/laura.md`).

**Interfaces:** Produces the guard Tasks 2 and 3 extend.

- [ ] Step 1: write the failing test (first part of `old-world-gone.test.ts`; `read`, `tracked`, `REPO` as `package-exports.test.ts` defines them, `tracked` = `git ls-files --cached --others --exclude-standard -- <paths>` minus `._*`):

```ts
// @module-tag unit
const OLD_PACKAGES = ["packages/auth-old", "packages/ui-old"] as const;
const CONFIGS = ["pnpm-workspace.yaml", ".gitignore", ".jscpd.json", ".oxlintrc.json", "biome.jsonc", "vitest.config.ts", "knip.jsonc", "turbo.json", "tsconfig.json"] as const;
const OLD_PATTERN = /(?:auth|ui)-old|\*-old/;
/** The pause: every config that once left Laura out. */
const PAUSE_CONFIGS = ["pnpm-workspace.yaml", "vitest.config.ts", ".oxlintrc.json", "biome.jsonc"] as const;

it.each(OLD_PACKAGES)("has no %s folder on disk", (path) => {
  expect(existsSync(resolve(REPO.ROOT, path))).toBe(false);
});
it.each(CONFIGS)("%s names neither old package nor a *-old pattern", (path) => {
  expect(read(path)).not.toMatch(OLD_PATTERN);
});
it.each(PAUSE_CONFIGS)("%s leaves no part of Laura out", (path) => {
  expect(read(path)).not.toMatch(/apps\/laura/); // biome's restricted-import entries name `@allonfire/laura`, which stays
});
```

- [ ] Step 2: run, expected FAIL (both folders exist on this Mac, the lines are there): `pnpm --filter @allonfire/config exec vitest run local/tests/old-world-gone.test.ts`
- [ ] Step 3: implement, in this order (reversing it makes pnpm treat the folders as workspace packages, since each holds a `package.json`): (a) ask the owner with `AskUserQuestion` in the same turn: "Delete `packages/auth-old` (56 MB) and `packages/ui-old` (77 MB)? They are untracked: git history cannot bring them back." Options: Delete / Keep a tar first (the owner names the folder: `COPYFILE_DISABLE=1 tar -C packages -czf <owner path>/old-packages.tgz auth-old ui-old`, then verify with `tar -tzf <file> | head`) / Not now (stop the task). (b) `rm -r packages/auth-old packages/ui-old`. (c) delete the config lines named above; reword the root `vitest.config.ts` comments to say what `projects` does and nothing about a pause. (d) delete the two-line paragraph of `packages/auth/README.md` (lines 29 and 30: "Laura still uses the old Next-bound package in `packages/auth-old`, untracked, until its refactor."); its Exports section already describes the Next-bound code, so no replacement is needed. (e) `pnpm install --frozen-lockfile` (expected exit 0, `git diff --stat pnpm-lock.yaml` unchanged: the lockfile never named them).
- [ ] Step 4: run, expected PASS: the Step 2 command; `pnpm static:knip`, `pnpm static:knip-production`; `pnpm test:unit` (the root `vitest.config.ts` projects glob now picks every package and App, Laura included: expect Laura's tests to run, none red).

### Task 2: Old Laura leftovers on disk, in the repo and in the core package

**Files:**
- Delete (on disk, ignored): `apps/laura/test-results/`, `apps/laura/.next/`, `apps/laura/tsconfig.tsbuildinfo`; gate: `apps/laura/seed-photos/` (492 MB) and the Local MinIO `laura` bucket (75 MB)
- Delete (tracked): `docs/screenshots/{laura-games,laura-quiz,laura-settings,mobile-laura-games,mobile-laura-quiz,mobile-laura-settings}.png`, `packages/core/src/features/errors/format-error-message.ts`
- Modify: `packages/core/package.json` (key `./features/errors/format-error-message`), `packages/core/README.md` (the section at line 90 and the example at line 218), `knip.jsonc` (the `format-error-message.ts` accept entry and its reason; confirm Phase 3 and 6 removed the other two "Held only by Laura" entries), `.gitignore` (the `apps/laura/seed-photos/` pair, if Phase 3 left it)
- Verify only (Phase 3 and 6 edit them; the test fails if they did not): `packages/config/local/tests/{package-exports,knip-config,env-examples,root-scripts}.test.ts`
- Test: `old-world-gone.test.ts` (second part)

**Interfaces:** none produced.

- [ ] Step 1: add the failing tests:

```ts
describe("the old Laura", () => {
  it("keeps one tracked public file, the favicon", () => {
    expect(tracked("apps/laura/public")).toEqual(["apps/laura/public/favicon.ico"]);
  });
  it.each(["scripts", "messages", "src/lib", "src/components", "src/i18n"])("has no apps/laura/%s", (folder) => {
    expect(existsSync(resolve(REPO.ROOT, "apps/laura", folder))).toBe(false);
  });
  it("keeps no ignore line for the seed photos", () => {
    expect(read(".gitignore")).not.toContain("seed-photos");
  });
  it("keeps no screenshot of a page that is gone", () => {
    expect(tracked("docs/screenshots").filter((path) => /games|quiz|settings/.test(path))).toEqual([]);
  });
  it("has no root script that builds Laura without its build arguments", () => {
    expect(read("package.json")).not.toContain("docker:build:laura");
  });
  it("has no formatErrorMessage in core: its only reader was the old quiz admin", () => {
    expect(tracked("packages/core/src/features/errors")).not.toContain("packages/core/src/features/errors/format-error-message.ts");
    expect(read("packages/core/package.json")).not.toContain("format-error-message");
  });
});
```

- [ ] Step 2: run, expected FAIL on the screenshots and `formatErrorMessage` (and on `seed-photos` only if Phase 3 left the ignore line).
- [ ] Step 3: implement. `git grep -w formatErrorMessage -- apps packages` once more: any reader other than core's README means stop and report. Then delete the file, its export key, the README section and example, and the `knip.jsonc` entry; `rm` the six screenshots; `rm -r apps/laura/test-results apps/laura/.next apps/laura/tsconfig.tsbuildinfo`. Then the two owner gates, each an `AskUserQuestion` in the same turn: (a) `apps/laura/seed-photos/`: recommended "Keep until uploaded", because these 172 curated photos are the source for Production's Gallery (Task 12, behind the "photos migrated" gate); on Delete: `rm -r apps/laura/seed-photos`. (b) The Local `laura` bucket: recommended the same; on Delete, remove it in the MinIO console (`LOCAL.PORT.STORAGE_CONSOLE`, `http://localhost:9001`, login from `docker/.env`, Buckets, `laura`, Delete). Neither is a repo file; the test cannot and does not look at them.
- [ ] Step 4: run, expected PASS: `pnpm --filter @allonfire/config exec vitest run local/tests/old-world-gone.test.ts local/tests/package-exports.test.ts local/tests/knip-config.test.ts local/tests/env-examples.test.ts local/tests/root-scripts.test.ts`, then `pnpm static:knip`, `pnpm static:knip-production`, `pnpm --filter @allonfire/core check-types`.

### Task 3: The old-words gates, as a test

The spec's gates as one test that fails by file and line, with every allowed occurrence listed and reasoned (like `knip.jsonc`'s ignore entries). Markdown is outside Turbo's inputs (`packages/config/turbo.json`), so a cached run can miss a doc edit: run this test directly, never only through `pnpm test:run`.

**Files:**
- Create: `packages/config/local/tests/old-words-gone.test.ts` (unit)

**Interfaces:** Produces `GATES` (name, pattern, person-phrase exception, allowed list with a reason each).

- [ ] Step 1: write the test. It reads every file `git ls-files --cached --others --exclude-standard` lists (skips `._*` and binary extensions, and itself), applies each gate line by line, and expects the offender list `["path:line: text", ...]` to equal `[]` after the allowed list. The gates, patterns exact:

```ts
const GATES = [
  { name: "Quiz", pattern: /quiz|GameType/i },
  { name: "Laura's Viewer", // the Viewer Role stays (ADR 0032); a line naming both it and Laura is the old logic
    pattern: /laura[^\n]*\b(?:VIEWER|Viewers?)\b|\b(?:VIEWER|Viewers?)\b[^\n]*laura/i },
  { name: "the pause", pattern: /until (?:it is |its |Laura's )?(?:rebuilt|rebuild)|once rebuilt|Laura (?:is|keeps|joins)|paused|[Hh]eld only by Laura|laura still turns|old Next|waits for Laura|answers 404 until/i,
    /* then narrowed: see the allowed list */ },
  { name: "heic2any and Framer Motion", pattern: /heic2any|framer[- ]motion/i },
] as const;
```

  Allowed (path prefix or exact, with the reason, each entry one line): `docs/superpowers/` (plans, specs and the parity audit are history); `docs/adr/0019`, `docs/adr/0032` (the Role's history); `docs/adr/0010`, `docs/adr/0017` and `docs/adr/0021` for the pause gate (history with a pointer, Task 6); `packages/database/changelog/changesets/` and `packages/database/liquibase/tests/changelog.integration.test.ts` (migrations and their test name the removed values); every `*.test.*` and `*.spec.*` file for the Viewer gate (Phase 0's pins name a Laura Viewer to prove it is refused), `CONTEXT.md` for the Viewer gate (the **Viewer** entry says Laura's floor was once Viewer); `packages/config/local/tests/laura-app.test.ts` and this file (they name the banned libraries); `CONTEXT.md` for Quiz (the `_Avoid_: quiz, mini-game` line of **Memory game**); `.claude/skills/impeccable/`, `.claude/skills/next-*`, `.claude/agents/impeccable-*` (vendored skills); `pnpm-lock.yaml`. Anything else is a failure to fix, never to allow: the allowed list is reviewed with the offender list. Reconcile the pause gate against the real repo first (`git grep -n -i -E "<pattern>" -- . ':!docs/superpowers'`), since "paused" also matches a CSS class in `departure-board.tsx` (`hover:paused`): narrow the pattern to `Laura`-bearing lines or allow that one line with its reason, never loosen the gate for the rest.
- [ ] Step 2: run directly, expected FAIL, listing the real offenders (before Tasks 1 to 3: `AGENTS.md`, `CONTEXT.md` line 9, `README.md` line 124, `docs/guides/*`, `.claude/commands/allonfire-deploy.md`, `.claude/skills/aof-*`, `docker/docker-compose.prod.yml` line 75, `apps/back-office/src/shared/constants/apps.ts` line 14 if Phase 3 left it, `packages/core/src/features/ci/affected.ts` line 6 if Phase 3 left it): `pnpm --filter @allonfire/config exec vitest run local/tests/old-words-gone.test.ts`
- [ ] Step 3: fix every offender in its owner task: code and config here or in Task 8, docs and skills in Task 6, README in Task 7. This task owns no edit except the code comments the gate finds in `apps/back-office/src/shared/constants/apps.ts` (reword "Laura's pictogram until its rebuild" to what the file does now) and `packages/core/src/features/ci/affected.ts` (reword the paused-Laura comment).
- [ ] Step 4: re-run at the end of Tasks 6, 7 and 8: PASS with an empty offender list.

### Task 4: The parity audit has no `pending` row and every `replaced by` names something real

**Files:**
- Modify: `packages/config/local/tests/laura-parity-audit.test.ts` (Phase 3 wrote it: reconcile, re-read it first, and reuse its row parser; a helper two tests need goes to a shared file, never copied), `docs/superpowers/specs/2026-11-17-laura-parity-audit.md` (rows only, to name real things)

**Interfaces:** Consumes the audit's row format (`| old | fate | replaced by or why |`, fate `replaced`, `kept` or `deleted`). Produces the resolver `resolves(token)` the new cases use.

- [ ] Step 1: add the failing cases (Phase 3's test already fails a `pending` or a missing row; these two are the new ones):

```ts
describe("every replaced row names something that exists", () => {
  // A token resolves when it is a tracked path (or a folder) under the repo, an `export` of a tracked source file,
  // a dependency of some package.json, or listed in EXTERNAL with its library.
  it("resolves at least one token of its 'replaced by' cell, and every token it names", () => {
    const unresolved = rows.filter((row) => row.fate.startsWith("replaced"))
      .flatMap((row) => tokensOf(row.target).filter((token) => !resolves(token)).map((token) => `${row.old}: ${token}`));
    expect(unresolved).toEqual([]);
  });
  it("has no replaced row with prose only", () => {
    expect(rows.filter((row) => row.fate.startsWith("replaced") && tokensOf(row.target).length === 0).map((row) => row.old)).toEqual([]);
  });
});
```

  `tokensOf(cell)`: the backticked spans of the cell, `{en,it}` braces expanded, a trailing `()` removed, spans holding a space, `=`, `<` or `*` dropped (a prop or a pattern is not a name). `resolves`: a token with `/` or a file extension matches a tracked path that equals or ends with it, or contains it as a folder; an identifier (`^[A-Za-z_$][\w$]*$`) has an `export (?:default )?(?:async )?(?:const|function|class|type|interface|enum) <name>\b` or `export {...<name>...}` in some tracked `.ts` or `.tsx` under `apps/` or `packages/` (read once, cached); a scoped or hyphenated name is a dependency key in a `package.json`; `EXTERNAL` is a short array of library names a row cites (`useInfiniteQuery`, `useQuery` of TanStack), each with its library in a comment.
- [ ] Step 2: run directly, expected FAIL on whatever the audit names loosely (Phase 3 wrote it before Phases 4 to 6 existed; rows written as "Phase N file" or an exact export that changed):  `pnpm --filter @allonfire/config exec vitest run local/tests/laura-parity-audit.test.ts local/tests/laura-app.test.ts`
- [ ] Step 3: fix the audit rows, not the test: name the real export (`git grep -n "export .*<name>" -- packages apps` finds it), or change the fate. Spec's required rows must exist: `lib/seo.ts`, `json-ld.tsx`, `apple-splash-links.tsx`, `user-role-provider`, `check-access`, `file-validation`, `blur-placeholder`, `animation-variants`, `framer-motion`, `lucide-react`, `react-hook-form`, `sonner`, `heic2any` (the test from Phase 3 names any file with no row). Phases 4, 5 and 6 each add rows (Phase 5 Task 19 for `features/upload`, `lib/file-validation.ts`, `lib/convert-heic.ts`): none is allowed to stay `pending`; `git grep -n -i pending -- docs/superpowers/specs/2026-11-17-laura-parity-audit.md` prints nothing.
- [ ] Step 4: run, expected PASS: the Step 2 command. State in the notes the count of rows by fate.

### Task 5: The shared scaffold between Laura and the Back Office is the same, as a test; jscpd stays clean

**Files:**
- Create: `packages/config/local/tests/app-scaffold-shape.test.ts` (unit)
- Modify: `.jscpd.json` (verify `path` holds `apps/back-office` and `apps/laura`; Phase 3 adds Laura)

**Interfaces:** Produces `SCAFFOLD_FOLDERS`, `ONLY` (differences on purpose, each with its reason), `RENAMED` (one Design's name for the same binding) and `GENERIC` (the floor: files both Apps must have).

- [ ] Step 1: write the test (arrays, `Map`, text; no `Object.*`). Shape of an App = its tracked source files, minus `tests/`, `*.test.*`, `*.browser.test.*`, `e2e/`, `._*`, relative to the App folder, under:

```ts
const APPS = ["back-office", "laura"] as const;
const SCAFFOLD_FOLDERS = [
  "src/environment", "src/shared/constants",
  "src/features/api", "src/features/auth", "src/features/errors", "src/features/i18n",
  "src/features/metadata", "src/features/navigation", "src/features/pwa",
  "src/app", // minus the signed-in Sections: only `(signed-in)/layout.tsx` and `(signed-in)/not-found.tsx` count
] as const;
const ROOT_FILES = ["src/proxy.ts", "src/instrumentation.ts", "src/instrumentation-client.ts"] as const;
```

  Tests:
  1. "has the same scaffold files in both Apps": `expected = shape(back-office) minus ONLY.backOffice, with RENAMED applied` equals `shape(laura) minus ONLY.laura`; on a mismatch the message lists each file with the App that lacks it.
  2. "lists no difference that is not there": every `ONLY` and `RENAMED` entry exists in its App (and an `ONLY` entry is absent from the other), so the list cannot rot.
  3. "keeps every generic binding in both": `GENERIC` (reconcile from Phase 1's "Slot rules" and Phase 3's File structure): `src/features/api/utils/{api,server-api}.ts`, `src/features/i18n/{routing,navigation,request}.ts` and `translations/{en,it}.json`, `src/features/navigation/{components/frame-breadcrumb.tsx,constants/section-row.ts,utils/signed-in-page.tsx}`, `src/features/pwa/components/{install-hint,install-hint-card,offline-banner,offline-card,offline-notice}.tsx`, `src/features/errors/components/{error-notice,not-found-notice}.tsx`, `src/features/auth/constants/dressing.tsx`, `src/features/metadata/utils/image-fonts.ts`, `src/shared/constants/{page-information.ts,action-dressing.tsx}`, `src/environment/environment.ts`, the proxy and both instrumentation files, the four auth pages and the Offline page under `src/app/[locale]`.
  4. "imports the same package pieces in each binding": for each `GENERIC` file that is a binding (not a JSON), the set of `@allonfire/(ui|core|auth)/...` specifiers is equal in both Apps (Design-package imports and App-relative imports are left out: that is where the dress differs). A listed exception carries its reason; an empty difference list is the expectation.
  5. "keeps each binding thin": each `GENERIC` binding in both Apps is at most 40 lines (Phase 1 says under 25 for the shared-piece bindings, Phase 3 under 40 for Laura's dressing files; the ceiling is the looser one, tightened by reading the real maximum at the end of Step 3).
  6. "scans both Apps for duplicate code": `.jscpd.json` holds `"apps/back-office"` and `"apps/laura"` in `path` and no `ignore` entry for either.
  7. "adds no unjustified jscpd:ignore block to Laura": every `jscpd:ignore-start` line in tracked non-test files of `apps/laura` is in `LAURA_IGNORES` (file, reason), and the line after it is a comment of at least 20 characters saying why (`tooling.md`: "whose first line says why"). Expected entries, from Phase 3: the two image routes Next reads from the file, `instrumentation*.ts`, `request.ts`, the `process.env.NEXT_PUBLIC_API_URL` literal in `environment.ts`; the test fails on any other and on a block around a whole file (first and last non-import lines both inside one block).
  `ONLY` seeds (reconcile by running Step 2; each entry is a Japan, Ocean or content file, nothing generic): Back Office, Japan: `features/auth/components/{departure-board,station-sign,back-to-sign-in}.tsx`, `features/auth/constants/{reset,sign-in}.ts`, `features/navigation/components/{header-kanji,sidebar-kanji,station-number}.tsx`, `features/pwa/constants/pwa-signage.ts`, `features/errors/constants/error-signage.ts`, `shared/constants/{action-kanji,copy}.ts`; Back Office, content: `shared/constants/{apps,query,mutation}.ts` where Laura's live inside `LAURA` or its feature folders (reconcile: Phase 3 and 4 decide), `features/navigation/constants/sections.ts`; Laura, Ocean: whatever Phase 3 named `ocean-*`. `RENAMED` (Back Office to Laura): `features/auth/components/ticket-gate.tsx` to `ocean-gate.tsx`, `features/errors/components/station-notice-frame.tsx` to `ocean-notice-frame.tsx`, `shared/constants/back-office.ts` to `laura.ts`. The rule for a new entry: it is allowed only if it is a Design's dress (kanji, station, ticket, torii, hanko, ocean) or an App's content (Users, Storage, Services, Images, Home; Gallery, Favorites, Games, Upload); a generic binding that exists in one App only is a bug to fix by moving the piece into a package or adding the binding.
- [ ] Step 2: run, expected FAIL printing the real difference (Phase 3 built Laura beside the Back Office, so the list is short): `pnpm --filter @allonfire/config exec vitest run local/tests/app-scaffold-shape.test.ts`
- [ ] Step 3: classify each difference into `ONLY` or `RENAMED` with its reason, or fix it (merge into a package, add the missing binding), never allow a generic one. Then `pnpm static:dupes`: expected exit 0 with no clone. A clone between the Apps is merged into `@allonfire/ui`, `core` or `auth` (ADR 0033); a block is wrapped only where Next or next-intl forces the same lines, with its reason first.
- [ ] Step 4: run, expected PASS: the Step 2 command, `pnpm static:dupes`, `pnpm static:knip`, `pnpm static:knip-production`. Record in the notes: the number of `ONLY` entries per App and the count of `jscpd:ignore` blocks in `apps/laura` (the target is only the forced ones) and in `apps/back-office` (it had 9 when this was written: 6 in browser tests, 3 in Next-forced or action files).

### Task 6: Docs: glossary, guides, ADR pointers, skills, with a test that the Laura guide is true

**Files:**
- Modify: `CONTEXT.md`, `AGENTS.md`, `docs/guides/{laura,next-apps,back-office,package-layout,design-system,tooling,deployment,testing,images,code-style,forms,database,api}.md`, `docs/adr/{0001,0010,0017,0021}-*.md` (one pointer each), `.claude/commands/allonfire-deploy.md` (line 183's example), `.claude/skills/aof-documentation/{SKILL.md,references/doc-map.md,references/doc-standards.md}` (Laura inventory, `:3200`, Framer Motion), `.claude/skills/aof-design/SKILL.md` (line 180)
- Create (tests): `apps/laura/src/shared/tests/laura-guide.test.ts`, `apps/api/src/features/docs/tests/laura-guide.test.ts`

**Interfaces:** Consumes `LAURA` (`@/shared/constants/laura`, Phase 3), `REPO`, the API's `createApp(appDeps())` and `API.PATH.OPENAPI`, core's `openApiPath`. Produces `docs/guides/laura.md` as the real Laura guide.

- [ ] Step 1: write the failing tests, in the style of `apps/api/src/features/docs/tests/api-guide.test.ts` (verified: it resolves backticked paths against the repo and expects them to exist).
  - `laura-guide.test.ts` (Laura): the guide's backticked repo paths exist (the same three regexes: from the repo root, from `apps/laura`, from `src`); every path of `LAURA.sections` and each Section's `pages` is named in the guide as a code span (Home as `/`) and has its page file (`src/app/[locale]/(signed-in)` plus the path, Home at the folder itself); no route code span in the guide (`^/[a-z-/]*$`) lacks a page file.
  - `laura-guide.test.ts` (API): every `METHOD /v1/...` code span of the guide (`GET|PUT|POST|PATCH|DELETE`) is an operation of the API's OpenAPI document (`createApp(appDeps()).request(API.PATH.OPENAPI)`, as `spec.test.ts` does for the whole app; a `:name` segment is read as `{name}` through `openApiPath`).
  Run both: expected FAIL (the guide is Phase 3's placeholder text, or the old app's).
- [ ] Step 2: run: `pnpm --filter @allonfire/laura exec vitest run src/shared/tests/laura-guide.test.ts` and `pnpm --filter @allonfire/api exec vitest run src/features/docs/tests/laura-guide.test.ts --tags-filter=unit`.
- [ ] Step 3: write the docs. Re-read every file against the code first (reconcile: Phases 3 to 6 each edited `laura.md` in small steps). Each edit is a pointer or a short fact, never a copy of code (`writing.md`), in the prose rules of Global Constraints.
  - `docs/guides/laura.md` becomes the Laura guide, in this order: what Laura is (Gallery with Favorites, Memory game with its leaderboard, private, nobody registers); **Sections and routes** (table: path, Section, Role, page file, skeleton: `/` Gallery, `/favorites`, `/memory`, `/memory/leaderboard`, `/upload` Admin only); the frame and the Design (`variant="floating"`, `collapsible="icon"`, Ocean, ADR 0033, `--frame-*` tokens in `design-system.md`); Roles (User browses and plays, Admin also sets Favorites, removes from Laura, uploads) and the Upload gate in four places (proxy `gated`, page `minRole`, frame row, API `authoriseUpload` and `requireApp(App.LAURA, Role.ADMIN)`); auth (no registration, an Admin adds Users in the Back Office, one Session across Apps on `AUTH_COOKIE_DOMAIN`, the tailnet note of `README.md`); **API routes** (table: method and path, guard, cache; from `apps/api/src/features/laura` and Phase 5's note that `POST /v1/images` is the shared route: `GET /v1/laura/gallery`, `GET /v1/laura/favorites`, `PUT` and `DELETE /v1/laura/favorites/:imageId`, `DELETE /v1/images` with `app` for "Remove from Laura", `POST /v1/images`, `GET /v1/laura/games/memory/deck`, `POST /v1/laura/games/memory/scores`, `GET /v1/laura/games/memory/leaderboard`); **tables** (`laura."Favorite"`, `laura."GameScore"`, the shared `image` schema, the Fixtures `FIXTURE.USER.LAURA.*`, `FIXTURE.FAVORITE`); **caches** (the private-cache tags and lives, `GALLERY.CACHE.TAG`, `GAMES.CACHE.TAG`, the query keys, who refreshes which copy, why a Back Office change reaches Laura after `stale`, why the deck is client-only, `useAOFLinkRefresh`, `invalidateStatic`); images (pointers to `images.md`; no native Web Share and why); env names and ports (3200 Local, 3210 e2e, 3220 preview); where each shared piece lives (pointers to `next-apps.md`, `package-layout.md`); hosting (a pointer to `deployment.md`); `## History and gotchas` (2026-11-17: Laura rebuilt on the packages; Viewer Role dropped, `0008`; Quiz and its rows removed, `00NN`; the old photos went at launch, `seed-photos` kept until uploaded).
  - `CONTEXT.md`: line 9, the **App** entry loses "(paused while the Design system is rebuilt)" and names Laura (Gallery, Memory game) and the Back Office as the two Apps; the **Back Office** line 19 `_Avoid_` loses the `(dashboard)` remark (Laura has no such route group); **Section** gains "Laura's are Gallery, Favorites, Memory and Upload"; confirm **Gallery**, **Favorite**, **Memory game**, **Role**, **App descriptor**, **Design** (Japan and Ocean) read true and **Viewer** is gone. Edit only these lines: the file holds the owner's other uncommitted edits.
  - `AGENTS.md`: line 15 becomes `apps/laura` (Next 16, 3200); the table row `| Laura | laura.md |` becomes `| Laura only: Sections, routes, API routes, tables, caches, Roles | laura.md |`. Nothing else: the file's rule is that it gains a line only when every edit needs it.
  - `next-apps.md`: "Back Office now, Laura once rebuilt" (two places) becomes "the Back Office and Laura"; the Environment pointer names both Apps' addresses. `package-layout.md`: delete "Laura keeps its old names until it is rebuilt"; the shared-scaffold map (Phase 1) names `app-scaffold-shape.test.ts` as its proof. `design-system.md`: delete "Laura joins once rebuilt"; Laura wears Ocean; the new-App line lists `lint-staged`, `static:fix`, `design:sync` and the three scripts. `tooling.md`: delete "laura still turns its dev cache off", reword the "Held only by Laura" example to a current kind of accept, and add one line on `jscpd:ignore` in Laura (the test of Task 5). `testing.md`: name `safeAreaSuite`, the Vitest presets, `environmentSuite`, `translationsSuite`, the e2e kit and `app-scaffold-shape.test.ts`. `back-office.md`: its pieces now say "dressed in the Back Office's slots" (Phase 1); add nothing for Laura. `images.md`: confirm Phases 4 and 5's lines (`useAOFLinkRefresh`, Laura's Upload, `withImageUploads`, no Web Share). `forms.md` line 70 and `code-style.md` line 8 (oxlint "ignores Laura"), 21 (Framer Motion: reword to "an animation that changes layout uses a library the repo already has; none today, so a new one needs 200,000 weekly downloads, `tooling.md`", and drop the example path to the deleted `motion-provider.tsx`) and 26 (the example path to a deleted Laura page: point at a current page). `database.md` and `packages/database/README.md`: the `laura` schema holds `Favorite` and `GameScore` only (Phases 4 and 6 edit these; check), and the Production diagram `db-backup --> db-migrate --> laura` names `back-office` and `laura`.
  - ADR pointers (one line each under the title, the style of ADR 0014's): 0010 "Laura left the pause in the Laura rebuild (ADRs 0032 and 0033); `auth-old` and `ui-old` are deleted"; 0017 the same for `react-hook-form`; 0021 line 50 "Laura is built on `AOFCreateNextConfig` since the rebuild"; 0001 "Laura reads and writes through the API since the rebuild (ADR 0033)". The old text stays as history.
  - `.claude`: `allonfire-deploy.md` line 183's example points at a current file; `aof-documentation` (`SKILL.md` lines 16, 109 to 114, 138; `doc-map.md` Laura inventory and features; `doc-standards.md` lines 100 to 108, 144 to 146, 166, 218) names the new Laura screenshots (`laura-gallery`, `laura-favorites`, `laura-memory`, `laura-leaderboard`, `laura-upload` and the `mobile-` twins), drops Framer Motion's two-second wait, quiz, settings and games, and keeps the `laura-` prefix; `aof-design/SKILL.md` line 180 says CSS only, as Phase 6 decided.
- [ ] Step 4: run, expected PASS: both guide tests; `pnpm --filter @allonfire/config exec vitest run local/tests/root-scripts.test.ts local/tests/old-words-gone.test.ts` (the doc scripts exist, the gates are quiet); `pnpm static:design`; `pnpm static:i18n`.

### Task 7: READMEs, logo and screenshots

**Files:**
- Modify: `README.md` (root; it is modified in the working tree by the owner: edit only what this step names), `apps/laura/README.md` (rewritten through `/aof-documentation`), `docs/assets/allonfire-laura-horizontal.svg`, `docs/screenshots/{laura-gallery,laura-favorites,laura-memory,laura-leaderboard,laura-upload}.png` and `mobile-laura-*.png` (Phase 3 left the screenshots to this phase), `packages/{auth,core,database,ui,design,storage,config}/README.md` (mentions only)

**Interfaces:** none produced. The screenshot recipe is `/aof-documentation`'s (naming, sizes: desktop 1440x900, mobile 390x844), the driver is `/iso-browser` first (announce Chrome's Allow in the same message; if its guard refuses, guided mode).

- [ ] Step 1: write nothing new to test: `old-words-gone.test.ts` and `laura-guide.test.ts` already fail on the old words and a dead path; run them directly for the failing state: `pnpm --filter @allonfire/config exec vitest run local/tests/old-words-gone.test.ts`.
- [ ] Step 2: `apps/laura/README.md` through `/aof-documentation`: centered header block, badges for what Laura now uses (Next.js 16, React 19, Tailwind 4, next-intl, TanStack Query; no Prisma, no BetterAuth badge of its own, no Framer Motion), the route table of `laura.md`, a pointer to `docs/guides/laura.md` for everything else. The root `README.md`: the Apps block lists the two Apps (the Back Office and Laura) with screenshots; the project-structure block lists `apps/{api,back-office,laura}` and `packages/{auth,config,core,database,design,shadcn,storage,ui}` (it lists only Laura and six packages today); the header badges drop Framer Motion and the BetterAuth/Prisma versions stop at what `package.json` pins (Prisma `^7.10.1`, `better-auth` `^1.5.3` in `packages/auth`); "Deploy" lists `laura` among the Deploy units and its one-time setup names `LAURA_URL`; delete "Laura is out of Production until its rebuild". Use `/iso-readme --check` after, and fix what it reports.
- [ ] Step 3: logo and screenshots. Regenerate `docs/assets/allonfire-laura-horizontal.svg` from the Brand with a scratchpad script run by `pnpm exec tsx <abs path>` from `packages/design` (`aofLogoSvg({ app: LAURA_LOGO, layout: AOF_LOGO.LAYOUT.<horizontal>, scheme: AOF_LOGO.SCHEME.<light> })`: read the real constants in `packages/design/src/brand/aof-logo.ts` first), never copied from `apps/laura/public`. With the Local stack and Laura up (`pnpm dev`, `pnpm dev:setup` once), signed in as the seeded Admin, with at least 6 Images (Task 11's smoke shares this need), capture the ten screenshots at the two sizes; delete nothing but the six files Task 2 removed.
- [ ] Step 4: run: `pnpm --filter @allonfire/config exec vitest run local/tests/old-world-gone.test.ts local/tests/old-words-gone.test.ts` PASS; check every `<img src>` in both READMEs resolves: `git grep -n "docs/screenshots\|docs/assets" -- README.md apps/laura/README.md` and `ls` each name.

### Task 8: Production wiring: the Laura service, its host, CORS, env, CI, ingress

**Files:**
- Modify: `docker/docker-compose.prod.yml` (a `laura` service; `API_CORS_ORIGINS`; the stale comment at line 74), `docker/.env.example` (`# LAURA_HOST=` beside Phase 3's `# LAURA_URL=`, in the `Laura` block, alphabetical), `.github/workflows/deploy.yml` and `.github/workflows/ci.yml` (verify only: Phase 3 added `LAURA_URL`; a Deploy unit needs no new line, `packages/core/src/features/ci/affected.ts` derives units from `apps/`), `docker/Dockerfile` (verify only: `ARG LAURA_URL`), `docs/guides/deployment.md`, `docs/guides/vps.md` (line 32), `README.md` (deploy section; the root README is shared with Task 7: one edit session), `packages/config/local/tests/{prod-compose,env-production,local-files,service-names}.test.ts`
- Verify: `packages/core/src/features/ci/tests/` still passes with `laura` among the units

**Interfaces:** Produces compose keys `LAURA_HOST` and `LAURA_URL` (required, `:?`), router and service `allonfire-laura`, GHCR image `ghcr.io/isaiascope/allonfire-laura:prod`, telemetry name `allonfire-laura`.

- [ ] Step 1: write the failing tests (exact text, like the file's own; `service("laura")` reads the block):
  - `prod-compose.test.ts`: `describe.each` for telemetry gains `["laura", "allonfire-laura"]`; a new case: the `laura` service holds `image: ghcr.io/isaiascope/allonfire-laura:prod`, `pull_policy: always`, `AUTH_APP=LAURA`, `API_AUTH_URL=http://api:3000/v1/auth`, `API_URL=http://api:3000`, `LAURA_URL=${required("LAURA_URL")}` (no `BACK_OFFICE_URL`: Laura never reads it, 2026-11-20), `AUTH_COOKIE_DOMAIN=${interpolate("AUTH_COOKIE_DOMAIN:-")}`, `condition: service_healthy` under `api`, the router lines with `Host(\`${LAURA_HOST}\`)` and `tls.certresolver=letsencrypt` and `loadbalancer.server.port=3000`, a `healthcheck` on `/sign-in`, no `ports:`; the `api` block's `API_CORS_ORIGINS` holds both origins (`https://${BACK_OFFICE_HOST:?...},https://${LAURA_HOST:?LAURA_HOST is required}`); the existing "every required key has a `.env.example` line" case (`it.each(REQUIRED)`) now covers `LAURA_HOST` and `LAURA_URL` by itself, and `EXAMPLES` gains `apps/laura/.env.example`.
  - `env-production.test.ts`: the ignored list gains `apps/laura/env/.env.production`.
  - `service-names.test.ts` and `local-files.test.ts`: confirm they stay green (run them; edit only if they enumerate Apps).
  - Tailscale (Local, unchanged): `package.json` `dev:tailscale` already serves `svc:laura` on `localhost:3200` and `local-files.test.ts` pins it (verified); the Service and its grant exist (ADR 0021). The one edit is in the root `README.md` Local steps (reconcile: re-read steps 5 to 9, they arrived with the tailnet work): step 5 already puts both Apps' tailnet addresses in `API_CORS_ORIGINS`, so nothing to add there; step 7 (`BACK_OFFICE_URL` in `apps/back-office/.env.development.local`, for link previews on the phone), step 8 (`NEXT_PUBLIC_API_REMOTE_URL`, the API's tailnet address a page opened off the Mac calls) and step 9 (`AUTH_COOKIE_DOMAIN`, in `apps/api/.env` and the App's file) name only the Back Office's file: each gains `apps/laura/.env.development.local` (`LAURA_URL`, `NEXT_PUBLIC_API_REMOTE_URL`, `AUTH_COOKIE_DOMAIN`), and step 9's last sentence says the cookie is one for the API and both Apps once they share the domain. A guard line in `local-files.test.ts` is not needed: the README is prose, and `env-examples.test.ts` (Phase 3) already pins that Laura's example lists those keys.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/config exec vitest run local/tests/prod-compose.test.ts local/tests/env-production.test.ts local/tests/service-names.test.ts local/tests/local-files.test.ts`
- [ ] Step 3: implement. The service mirrors the Back Office's block (read it, `docker/docker-compose.prod.yml` lines 135 to 166, as the model): image, `pull_policy: always`, `restart: unless-stopped`, `depends_on: api (service_healthy)`, the environment above plus the three telemetry lines (`TELEMETRY_SERVICE_NAME=allonfire-laura`), the `/sign-in` healthcheck (interval 30s, timeout 10s, retries 3, start_period 30s), networks `allonfire` and `dokploy-network`, the four Traefik labels with `LAURA_HOST`. The comment above it says which build args are baked in (`NEXT_PUBLIC_API_URL`, `LAURA_URL`; `deploy.yml` gives `BACK_OFFICE_URL` to the Back Office only) and that `LAURA_URL` is also read at runtime, the same value. Delete the comment at line 74 (`Laura is out of Production until its rebuild (ADR 0010)`). Then `pnpm static:dupes`: two near-identical Next services will clone. First remedy: a YAML anchor `x-next-app` holding what is image-independent (`pull_policy`, `restart`, `depends_on`, `healthcheck`, `networks`), as `x-db-job` does, so each service keeps only `image`, `environment` and `labels`; second remedy, only where compose forces the same list (the environment lines), `# jscpd:ignore-start` with a reason line first, as lines 60 to 69 and 374 to 425 do. Never a block around the whole service.
  Docs in the same step: `deployment.md` (Hosts: `laura.` serves Laura; Production order `db-backup`, `db-migrate`, `storage-setup`, `api` healthy, then `back-office` and `laura`; delete "Laura is out of Production until its rebuild"; the build-args line is already true (the Back Office's build needs `BACK_OFFICE_URL` and `LAURA_URL`, Laura's only `LAURA_URL`; Task 8 verifies it, no edit); the ingress line, Phase 5's: Traefik sets no body limit, Cloudflare's free plan caps a request body at 100 MB while the API's `IMAGE.LIMIT.UPLOAD_BYTES` is now 90 MiB (94,371,840 bytes, lowered 2026-11-19), so a batch above 100 MB is refused at Cloudflare before it reaches either App: **owner's call**, lower `IMAGE.LIMIT.UPLOAD_BYTES` to 95 MiB or accept it; verify Cloudflare's current limit before writing the number); `vps.md` line 32 becomes `laura.`: proxied, serves Laura (`laura.md`), plus the History line of Task 12 step 5 (the inventory docs name no other old Laura item: `git grep -n -i laura -- docs/guides/vps*.md` shows only that line before and after); `deployment.md` lines 10 and 33 and the compose comment at line 74 lose every "out of Production" and "waits for" wording (the gate of Task 3 fails on any left); `README.md` deploy section: units `api`, `back-office`, `laura`, `db-migrate`, secret `LAURA_URL` in `prod` and `dev`.
- [ ] Step 4: run, expected PASS: the Step 2 command; `pnpm --filter @allonfire/config test`; `pnpm static:workflows` and `pnpm static:migrate-image` (Docker); `pnpm static:dupes`; `pnpm --filter @allonfire/core exec vitest run src/features/ci`. Build proof when Docker runs (report if it does not): `docker build -f docker/Dockerfile --build-arg APP_NAME=laura --build-arg NEXT_PUBLIC_API_URL=http://localhost:3300 --build-arg LAURA_URL=http://localhost:3200 -t allonfire-laura-check .` exits 0 (Phase 3 ran it once; this proves the final tree). The health path: `pnpm --filter @allonfire/laura build`, then `pnpm --filter @allonfire/laura preview` (port 3220; reconcile: the script is the Back Office's twin) and `curl -sIL http://localhost:3220/sign-in | grep '^HTTP'` answers `307` then `200` (unverified when written: Laura was not runnable).

### Task 9: A schema round trip over the three Laura changesets

Phases 0, 4 and 6 each test their own rollback. This is the one test that rolls all of them back in order and forward again, which is what `rollback --tag=<last deployed>` does on the VPS.

**Files:**
- Modify (test): `packages/database/liquibase/tests/changelog.integration.test.ts` (integration; re-read it: Phase 0 added `CHANGESETS_FROM_LAURA_VIEWERS`, Phase 4 and 6 their cases)

**Interfaces:** Consumes the file's `liquibase`, `throwawayName`, `throwawayUrl`, `recreateDatabase`, `clientFor`, `dropDatabase`, `tablesIn`, `CHANGESETS_FROM_LAURA_VIEWERS`.

- [ ] Step 1: write the failing test on its own throwaway database (`changelog_rebuild`): `update`; read a snapshot (every `information_schema.columns` row of schemas `auth` and `laura`: table, column, type, nullability, ordered); `rollback-count` with `--count=${CHANGESETS_FROM_LAURA_VIEWERS}`; assert the snapshot differs in exactly these ways: `Favorite` and its columns are gone, `GameScore` has `gameType` and `metadata` again, the Role enum holds `VIEWER` again; `update` again; assert the snapshot equals the first. Each step has `TEST_DATABASE.DOCKER_TIMEOUT_MS`.
- [ ] Step 2: run, expected FAIL only if a rollback is not symmetrical (then the changeset's `--rollback` lines are fixed in its own phase's file: report it, do not edit an applied changeset): `pnpm test:services && pnpm --filter @allonfire/database exec vitest run liquibase/tests/changelog.integration.test.ts`. Note: it passes at once when the three rollbacks are right; it is a pin, not a red test.
- [ ] Step 3: nothing to implement unless Step 2 reports an asymmetry.
- [ ] Step 4: run, expected PASS; then `pnpm test:drift` (`No difference detected.`).

### Task 10: The VPS inventory is still true, and the KEEP list (read-only)

The coordinator's audit (`docs/superpowers/specs/2026-11-17-laura-vps-cleanup-inventory.md`, 2026-11-17) found nothing of old Laura to delete on the VPS. A deploy changes things, so this task proves it twice with the same read-only commands: before the promotion (Task 11 step 3) and after the deploy settles (Task 11 step 4). No command here writes, restarts or deletes anything. The executor opens the connection with `/hetzner-ssh` (host `main`, alias `main-vps`, passwordless sudo, `vps.md`) after the owner's go.

**Files:**
- Modify: `docs/superpowers/specs/2026-11-17-laura-vps-cleanup-inventory.md` (append a dated section "Re-check, before the promotion" and one "Re-check, after the deploy"; edit nothing above)
- Test: none (a live host cannot be a unit test); the Phase 7 doc gates (Task 3) are the automated half and Task 8 edits the docs that still name Laura wrongly.

**Interfaces:** Consumes the inventory table. Produces the two dated sections and the KEEP list below.

The commands are written from the names in `vps.md` and `docker-compose.prod.yml`, not copied from the coordinator's run (that run's command list was not handed over): when a name filter matches nothing, the executor fixes the filter (`docker ps --format '{{.Names}}'` shows the real names, Dokploy prefixes them `applications-allonfire-nrnhaj-`), never the expectation. A value is never printed: key names only.

- [ ] Step 1: Docker. Expected: every line prints nothing before the promotion; after the deploy, the same lines print nothing too (the new service's image is excluded by name), and the last line prints exactly one healthy container.

```sh
docker ps -a --format '{{.Names}}\t{{.Image}}' | grep -i laura | grep -v 'ghcr.io/isaiascope/allonfire-laura:'
docker images --format '{{.Repository}}:{{.Tag}}' | grep -i laura | grep -v '^ghcr.io/isaiascope/allonfire-laura:'
docker volume ls --format '{{.Name}}' | grep -i laura
docker network ls --format '{{.Name}}' | grep -i laura
docker ps --filter name=laura --format '{{.Names}}\t{{.Status}}'   # before: nothing; after: one container, (healthy)
```

- [ ] Step 2: Dokploy files and Traefik. Expected: nothing before; after the deploy only `LAURA_HOST` and `LAURA_URL` (Laura's router lives in the compose labels, so no Traefik file names it).

```sh
sudo grep -ril laura /etc/dokploy/traefik/dynamic/
sudo grep -i '^LAURA_' /etc/dokploy/compose/applications-allonfire-nrnhaj/.env | cut -d= -f1
sudo ls /etc/dokploy/compose /etc/dokploy/applications
```

  The last line lists the other Dokploy projects: the expected names are the compose project `applications-allonfire-nrnhaj` and the `monorepoonfire-...` application, no `*laura*` directory.
- [ ] Step 3: Redis and storage. The project's Redis is the one whose name is not `dokploy-redis` (ADR 0002). Expected: nothing, then exactly `image` and `telemetry`.

```sh
docker ps --format '{{.Names}}' | grep -E 'redis|storage'
docker exec <allonfire redis container> redis-cli --scan --pattern '*laura*'
docker exec <allonfire storage container> ls /data
```

- [ ] Step 4: Postgres, database `allonfire` (one psql call, read-only statements). Expected: schemas `auth`, `image`, `laura` (plus `public`); one table `laura."GameScore"` with 0 rows and the enum labels `MEMORY`, `QUIZ` before Phase 6 deploys, `MEMORY` only after; `laura."Favorite"` appears only after `0009`; `auth."Membership"` has no `VIEWER` label in `Role` after `0008`; `image."ImageApp"` is 0 before the owner uploads.

```sh
docker exec $(docker ps -qf name=dokploy-postgres) psql -U dokploy -d allonfire \
  -c '\dn' -c '\dt laura.*' -c '\dT+ laura.*' -c '\dT+ auth.*' \
  -c 'select count(*) from laura."GameScore"' \
  -c 'select app, role, count(*) from auth."Membership" group by 1, 2 order by 1, 2' \
  -c 'select count(*) from image."ImageApp"' \
  -c "select id from databasechangelog order by orderexecuted desc limit 3" \
  -c '\du'
```

  (`\du` lists roles: expected the roles of `vps.md` only, none named for Laura; `databasechangelog` lives in the database's default schema, drop that line if Liquibase keeps it elsewhere: `\dt *.databasechangelog` finds it.)
- [ ] Step 5: GitHub and Cloudflare, from the Mac. Expected: only `TURBO_TOKEN` and `TURBO_TEAM` before Task 11 step 1 adds `LAURA_URL`; after it, `LAURA_URL` in environments `dev` and `prod` and nothing older. The `laura.` record is proxied.

```sh
gh secret list --repo IsaiaScope/allonfire
gh variable list --repo IsaiaScope/allonfire
gh secret list --repo IsaiaScope/allonfire --env prod
gh secret list --repo IsaiaScope/allonfire --env dev
dig +short laura.isaiariva.com   # Cloudflare addresses, not the VPS's 188.245.174.30 (proxied)
```

  The Cloudflare record list is the owner's console (this repo holds no Cloudflare route for the executor): the owner confirms `laura` is the only record naming Laura and that it stays proxied. GHCR is Task 12, because `gh` lacks `read:packages`.
- [ ] Step 6: Write the result into the inventory: one row per line above, `expected | found | match`. Any difference is reported to the owner, never fixed here: a Laura object that was not in the inventory becomes a new owner decision (keep or delete, with its proof), and a delete of it is then its own owner-confirmed step ("STOP: ask the owner to confirm this exact list", the exact command, a before and an after listing, `db-backup` dump first), planned when it happens.
- [ ] Step 7: The KEEP list. Print it into the inventory section and have the owner read it before Task 12; nothing in this plan, the owner's prune included, is allowed to touch it: objects of the shared `image` bucket; the `auth` schema; the `laura` schema with `"GameScore"` and `"Favorite"`; the `laura.` Cloudflare record; `LAURA_HOST`, `LAURA_URL` in the compose env and `LAURA_URL` in GitHub environments `dev` and `prod`; `dokploy-postgres`, `dokploy-redis`, the `monorepoonfire` application and its database; the volumes `allonfire-db-backups` and `storage_data` (and `old_storage_data`, until the owner decides in Task 12).

### Task 11: Production runbook: backup, deploy order, smoke checklist (owner-run, nothing here is automated)

**Files:** none in the repo. The owner runs it; the executor prepares and checks each item first. Every step names who acts. Server access through `/hetzner-ssh`; browser work through `/iso-browser`; Dokploy and Cloudflare are the owner's consoles.

- [ ] Step 1: Preconditions on GitHub and Dokploy, in this order, before Phase 3 lands on `dev` and again before the promotion. (a) GitHub secrets `LAURA_URL` in environments `dev` (CI's `build` job reads it) and `prod` (the image build arg), each its own value: `pnpm env:prod gh-secret docker/.env.production LAURA_URL prod` for `prod`, the `dev` one by `gh secret set LAURA_URL --env dev` with the dev value; `BACK_OFFICE_URL` and `NEXT_PUBLIC_API_URL` already exist. (b) `docker/.env.production` gains `LAURA_HOST` (`laura.isaiariva.com`) and `LAURA_URL` (`https://laura.isaiariva.com`): `pnpm env:prod check docker/.env.production` exits 0 (it names an empty key without printing a value). (c) Dokploy: copy both keys into the compose project's env (`pnpm env:prod copy docker/.env.production LAURA_HOST`, paste, then `LAURA_URL`). The compose refuses to parse without them (`:?`), which fails the deploy before any container is touched. (d) Cloudflare: the `laura` A record exists, proxied, pointing at the VPS (`docs/guides/vps.md`); SSL/TLS stays Full (strict); no Cache Rule needed (pages are dynamic; only `cdn.` has the bypass rule). (e) Dokploy's `ghcr.io` registry login (`read:packages`) covers the new package `allonfire-laura`; the first pull proves it.
- [ ] Step 2: Pre-deploy backup and the restore point. `db-backup` is the first service of every deploy (`docker-compose.prod.yml`: a `pg_dump -Fc` verified with `pg_restore --list`, newest 14 kept, volume `allonfire-db-backups`, same disk as the database), so the dump that precedes `db-migrate` exists by construction. The owner also (a) confirms the off-site copy is fresh: `aws s3 ls s3://<backup-bucket>/daily/ | tail -1` on the VPS (`vps-backups.md`); (b) when the last deploy is more than a day old, takes a manual extra dump from the Dokploy compose directory (`database/README.md`, Production): `docker compose -f docker/docker-compose.prod.yml run --rm db-backup`; (c) lists the dumps and writes the newest name (`allonfire-<stamp>.dump`) in the notes as the restore point for the one-way changesets (`0008`, `0009`, `0010`): `docker run --rm -v allonfire-db-backups:/backups alpine ls -l /backups`. Last resort restore: the `pg_restore --clean --if-exists --no-owner -d <url> /backups/allonfire-<stamp>.dump` line of `packages/database/README.md`.
- [ ] Step 3: Run Task 10 (the "before the promotion" re-check), then promote once, after Phase 7 is on `dev`: `/iso-push --cascade test` then `--cascade prod` (the owner; `ci-branch-gate.yml` enforces `dev` to `test` to `prod`). Only the push to `prod` deploys: `deploy.yml` builds the affected Deploy units (`db-migrate`, `api`, `back-office`, `laura`: the `deployed/prod` tag diff includes the new `laura` app) as `:<sha>`, tags every one `:prod` once all exist, redeploys the compose project and polls Dokploy up to 15 minutes. If `laura` is missing from the build matrix, run the workflow by hand (`gh workflow run deploy.yml --ref prod`: a manual run deploys every unit). Watch: `gh run watch`.
- [ ] Step 4: Post-deploy smoke checklist, in order; stop at the first failure and use the rollback notes above. First note for the owner: **the Gallery is empty after this first deploy** (no `image."ImageApp"` row exists; the Production Gallery starts from the owner's own upload, step 5), so every item that needs a photo (7 and 8) begins with the upload of item 7, and item 8 will say "needs more Images" until six exist. Then run Task 10's "after the deploy" re-check once the checklist is done. (1) `deploy.yml` green, `deployed/prod` tag moved, Dokploy deployment `done`, `docker ps` on the VPS shows `allonfire-laura` healthy. (2) `db-migrate` log: `0008`, `0009` and Phase 6's changeset applied, release tagged `v<package.json version>`; in the database `auth."Membership"` holds no `VIEWER` (the enum has none) and `\d laura."GameScore"` has no `gameType` and the `GameType` enum has no `QUIZ` label (Phase 6's changeset removes the value; the table has 0 rows, so no row is deleted). (3) TLS and routing: `curl -sIL https://laura.isaiariva.com/sign-in | grep '^HTTP'` (a 307 to the language, then 200), valid Let's Encrypt certificate, `robots.txt` answers as the Back Office's does (Laura is unindexed). (4) Sign in as the real Admin at Laura: lands on the Gallery, Upload row present; sign in as a Laura User created in the Back Office (Users, Add, App Laura, Role User): no Upload row, `/upload` sends Home; a Back Office-only Admin and a User with no Membership are refused with the forbidden copy. (5) One Session across Apps: signed in at the Back Office, open Laura: no second sign-in; each App's switcher lists the other and the Back Office's Laura link opens `https://laura.isaiariva.com`. (6) CORS: the sign-in at Laura works (a wrong origin would answer `INVALID_ORIGIN`): this proves `API_CORS_ORIGINS`. (7) As Admin: Upload one private photo, it appears in the Gallery without a reload, its picture comes from `cdn.isaiariva.com` as a signed link with a blur first, set it Favorite, see it in `/favorites`; a User sees a static mark and no control. (8) Memory: with fewer than 6 Images the hub says it needs more; with 6 or more, play a game, the score shows on `/memory/leaderboard`. (9) PWA: install on an iPhone (Add to Home Screen) and on Chrome, open offline (airplane mode) and see the Offline page in the page's language. (10) Link preview: fetch the head as a crawler would and read the tags, `curl -sS -A "facebookexternalhit/1.1" https://laura.isaiariva.com/en/sign-in | grep -o '<meta[^>]*og:[^>]*>'` (title, description, `og:url` and `og:image` absolute under `https://laura.isaiariva.com`, never `localhost`), `curl -sI` the `og:image` URL (200, `image/png`, under 300 KB), then paste the link into WhatsApp or iMessage for the real unfurl (or Meta's Sharing Debugger). (11) Telemetry: OpenObserve (`observe.isaiariva.com`) shows logs for service `allonfire-laura`. (12) Cloudflare body limit: upload a batch near 90 MB (the Back Office's Add Images, or Laura's Upload) and a batch above 100 MB: record which are refused, then settle the owner's call of Task 8.
- [ ] Step 5: Populate (the owner's data, last): upload the curated photos from `apps/laura/seed-photos/` through Laura's Upload as Admin (Task 12 step 2 is the gate and the evidence list; nothing on this Mac is deleted here). Production holds no old `laura` bucket: the MinIO console (`storage.isaiariva.com`, behind the admin gate) lists `image` and `telemetry` only, as Task 10 step 3 read.

### Task 12: Owner hand tasks after the promotion: GHCR, photos migrated, optional prune

Nothing here is automated and nothing here is on the VPS's critical path. Each deletion waits for its own gate; none is done without the owner's yes in the same turn (`AskUserQuestion`), and none touches the KEEP list of Task 10.

**Files:** none in the repo.

- [ ] Step 1: GHCR package `allonfire-laura`. `gh` lacks `read:packages`, so the executor cannot read it (do not widen the token). The owner opens `https://github.com/IsaiaScope?tab=packages` and looks for `allonfire-laura`. The package is the rebuilt Laura's own image after Task 11 step 3, so: before the promotion, if it exists, it is an old-Laura package: delete it (Package settings, Danger zone, Delete) or, if he prefers, keep it (the deploy overwrites its `:prod` and `:<sha>` tags); after the promotion it must exist, with a `:prod` tag, and stays. Old tags of other names (a `latest` from the old build) are deleted from its Versions page. The owner records which in the inventory (a row `GHCR allonfire-laura | github.com | keep, now Laura's image | looked at by the owner, date`).
- [ ] Step 2: The "photos migrated" gate. Before Step 3, all of these hold, each written in the notes with its evidence: (a) Laura is deployed and the smoke checklist of Task 11 step 4 passed; (b) as Admin, the owner uploaded the curated photos from `apps/laura/seed-photos/` through Laura's Upload section (up to 20 files and 90 MiB a request; 172 files is 9 requests; every Image lands in Laura only, private); (c) the evidence: the Gallery shows the expected count (`select count(*) from image."ImageApp"` on the VPS, through Task 10's read-only psql line, equals the files uploaded: 172), and a sample of 5 photos was opened full size on the phone; (d) the owner says in the same turn that nothing in the old photos is still wanted. If any of (a) to (d) is missing, stop: the old files are the only copy (the VPS bucket never had them).
- [ ] Step 3: Only after Step 2, and each on its own yes: (a) `apps/laura/seed-photos/` (492 MB): `rm -r apps/laura/seed-photos` (idempotent with `rm -rf`; check with `ls apps/laura` before and after, and `du -sh apps/laura` frees about 492 MB); (b) the Local MinIO `laura` bucket (75 MB, this Mac only): MinIO console `http://localhost:9001`, Buckets, `laura`, Delete (check `docker exec allonfire-storage sh -c 'du -sh /data/*'` before and after: `laura` gone, `image` stays). Production has no `laura` bucket; do not look for one to delete.
- [ ] Step 4: Optional Docker housekeeping on the VPS, the owner's call and outside Laura's scope (the audit found 9 unused anonymous volumes and up to 1.88 GB of reclaimable layers; disk is at 34%, so nothing is urgent). List first and read the list: `docker volume ls -f dangling=true`, `docker system df`, `docker image ls --filter dangling=true`. The owner picks names, in this order of safety: dangling images (`docker image prune -f`, never `-a`: `-a` also removes the images of stopped services that a rollback pulls again), then named dangling volumes one by one (`docker volume rm <name>`, after `docker volume inspect <name>` shows no recent use). Never `docker volume prune` and never `docker system prune --volumes`: they cannot tell `allonfire-db-backups`, `storage_data` or `old_storage_data` from an orphan whose container is stopped. `old_storage_data` (read by `storage-move`, a rollback copy of the Storage data) is its own decision: keep until the owner decides the move was good, then `docker volume rm` after a fresh `postgres-all` and the weekly storage mirror have both run (`vps-backups.md`). After any deletion: `docker system df` frees what was listed, `docker compose ps` (from the compose directory) shows every service `healthy`, and Task 10's step 1 to 3 print the expected lines.
- [ ] Step 5: Close the inventory: append a section "Owner tasks, done" with the date and what was deleted or kept in Steps 1 to 4; add one dated line to `docs/guides/vps.md` History and gotchas: `2026-11-17: old Laura confirmed gone from the VPS by a read-only audit; the rebuilt Laura is one compose service in the allonfire project` (the doc edit of Task 8 holds the same wording: reconcile, do not duplicate).

### Task 13: Release checks (the owner cuts the version)

The repo cuts a version when a branch lands on `dev`: `/iso-push` (the only commit it makes is the bump) computes it from the range since `VERSION` last changed, commits `chore(release): X.Y.Z` on a `release/vX.Y.Z` branch, opens a PR to `dev`, lands it with a merge commit and tags `vX.Y.Z` (git log shows `release/v0.7.0` to `v0.10.0`, each `chore(release)` then `Merge pull request`; `VERSION` is `0.10.0`; `package.json` carries the same number, which `db-migrate`'s release tag reads). Test and prod promote the same commit and cut nothing. This plan changes none of that and cuts nothing; it lists what the owner checks before and after.

**Files:** none.

- [ ] Step 1: Before the first landing: the range a landing would release, as the skill computes it: `git log --no-merges --oneline "$(git log -1 --format=%H origin/dev -- VERSION)"..origin/dev` (verified form; run it for each of the eight landings). Each phase's commits use `/iso-commit` (Conventional Commits, `feat(<scope>):` for a phase that adds behaviour, no `Co-Authored-By`, no AI attribution: the owner's rule in `~/.claude/CLAUDE.md`).
- [ ] Step 2: The bump is a minor for a `feat` and a major for a `!` or a `BREAKING CHANGE:` body. **Owner's call**: whether Phase 0 (the `Role` enum loses a value, so the API's `Role` schema shrinks) and Phase 6 (a route family and a game removed) are marked breaking. Nothing here marks them.
- [ ] Step 3: After each landing: `git show origin/dev:VERSION` equals the root `package.json` `version` (`node -p "require('./package.json').version"`), the annotated tag exists (`git tag -n1 | tail -3`), and the tag's first line is a release title, not a PR subject. After the promotion: `git describe origin/prod` names the last release.
- [ ] Step 4: Nothing in this phase's files carries a version (the docs never name `0.x.y` except history lines); `git grep -n "0\.1[0-9]\.[0-9]" -- docs/guides README.md` prints only dated history.

### Task 14: Final acceptance and review checkpoint

**Files:** none new; this task runs everything and fixes what it shows in the owning task.

- [ ] Step 1: Static: `pnpm static:fix` (Ultracite, then both Apps' `tailwind:fix`), `pnpm static:lint`, `pnpm static:dupes`, `pnpm static:knip`, `pnpm static:knip-production`, `pnpm static:types`, `pnpm static:i18n`, `pnpm static:tailwind`, `pnpm static:design`, `pnpm static:workflows`, `pnpm static:migrate-image`, `pnpm static:shell`; or all of them in order with `pnpm static` (it stops at the first failing tool). Expected: no clone, no unused file or export, `pnpm install --frozen-lockfile` exit 0.
- [ ] Step 2: The Phase 7 guards, run directly (Markdown is outside Turbo's inputs): `pnpm --filter @allonfire/config exec vitest run local/tests/old-world-gone.test.ts local/tests/old-words-gone.test.ts local/tests/app-scaffold-shape.test.ts local/tests/laura-parity-audit.test.ts local/tests/laura-app.test.ts local/tests/prod-compose.test.ts`, `pnpm --filter @allonfire/laura exec vitest run src/shared/tests/laura-guide.test.ts`, `pnpm --filter @allonfire/api exec vitest run src/features/docs/tests/laura-guide.test.ts --tags-filter=unit`. And the two raw gates: `git grep -n -i "quiz\|GameType" -- . ':!docs/superpowers' ':!packages/database/changelog' ':!CONTEXT.md' ':!packages/database/liquibase/tests'` and `git grep -niE "laura.*viewer|viewer.*laura" -- . ':!docs/superpowers' ':!docs/adr/0019*' ':!docs/adr/0032*' ':!packages/database/changelog' ':!packages/database/liquibase/tests' ':!CONTEXT.md' ':!*.test.*' ':!*.spec.*'` print nothing.
- [ ] Step 3: Every phase's own checkpoint, all green on the final tree (their commands, verified in their plans): Phase 0: `pnpm turbo run check-types test --filter=@allonfire/database --filter=@allonfire/auth --filter=@allonfire/api --filter=@allonfire/storage --filter=@allonfire/core --filter=@allonfire/ui --filter=@allonfire/design --filter=@allonfire/back-office`, `pnpm test:drift`. Phase 1: `pnpm turbo run check-types test --filter=@allonfire/core --filter=@allonfire/auth --filter=@allonfire/ui --filter=@allonfire/back-office --filter=@allonfire/config`, `pnpm turbo run test:browser --filter=@allonfire/ui --filter=@allonfire/back-office`. Phases 2 to 6: the same filters plus `@allonfire/laura`, `@allonfire/design`, `@allonfire/storage`, `@allonfire/database`, `@allonfire/api`. In one command, from Docker running: `pnpm test:services && pnpm turbo run check-types test test:browser` then `pnpm test:drift`.
- [ ] Step 4: e2e on the production builds, four projects each (`chromium`, `webkit`, `mobile-chrome`, `mobile-safari`): `pnpm test:services && pnpm e2e:run` (turbo runs `test:e2e` for the API-backed Apps: Back Office and Laura), no spec edited beyond import paths and suite calls. `pnpm build:apps` builds both Apps as the Docker image does.
- [ ] Step 5: Manual smoke on Local, owner-driven or `/iso-browser`-driven, announcing Allow (`feedback_browser_testing`; "test together" means the owner drives, the executor gives the checklist and watches logs). Local needs: the seeded Admin (Admin in every App), a Laura User created in the Back Office (Users, Add, App Laura, Role User), at least 6 Images in Laura. At 390 wide (phone, also rotated, for the notch) and at 1440 wide, for each route, as User and as Admin: `/sign-in`, `/forgot-password`, `/reset-password` (from the mail link), `/email-verified`, `/` (Gallery: tiles with blur, preview, keyboard arrows and Escape, Favorite mark for a User, heart for an Admin), `/favorites`, `/memory` (hub, a full game, the dialog, Play again), `/memory/leaderboard`, `/upload` (Admin: pick, HEIC preview, submit, the Gallery shows it; User: sent Home and no menu row), a 404 (`/no-such-page`), the Offline page, the language switch and theme in the account menu, sign out. Each page: no horizontal scroll, nothing under a notch or the home indicator, the skeleton as tall as the page. Phone and wide are checked in the frame too: floating sidebar and collapsed icons wide, drawer on a phone.
- [ ] Step 6: PWA and previews on a build: `pnpm --filter @allonfire/laura build` then `preview` (port 3220): install (Chrome's Install, iPhone's Add to Home Screen steps from the hint), go offline in DevTools and reload (the Offline page, then retry online); manifest `display: "standalone"`; fetch the head as a crawler would: `curl -sS -A "WhatsApp/2.23" http://localhost:3220/en/sign-in | grep -o '<meta[^>]*og:[^>]*>'`; open the `og:image` URL and check it is 1200 by 630 and under 300 KB (`head.spec.ts` asserts the same in CI). `og:url` and `og:image` use `LAURA_URL` as the origin: with `LAURA_URL` at `http://localhost:3200` Local shows that, not 3220; the Production check is Task 11 step 4 (10).
- [ ] Step 7: Boundary proofs: `git grep -n "BACK_OFFICE\|LAURA" packages/ui packages/core packages/auth` prints nothing outside tests and the guard's `ALLOWED`; `git grep -n "@allonfire/laura\|apps/laura" -- packages ':!packages/config' ':!packages/design/src/apps'` prints only comments; no `._*` file was created by this phase (`git status --short | grep '\._'` is empty); `git status` lists only the files of this plan plus the owner's earlier uncommitted work.
- [ ] Step 8: Report, in the notes: the pass counts per command; the count of `ONLY` entries and of Laura's `jscpd:ignore` blocks; the owner actions still open (secrets, Dokploy env, the Cloudflare limit decision, the breaking-version decision, the GHCR package check, the "photos migrated" gate with `seed-photos` and the Local `laura` bucket, the optional Docker prune) and the promotion order. Stamp this plan done (`/iso-write` does it) and stop: the owner reviews every change, commits by hand and cuts the release.
