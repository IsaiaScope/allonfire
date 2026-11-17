# Laura Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `apps/laura` into a new Next App on the shared scaffold, built to the Back Office's level and wearing Polpo: empty `src/`, env, i18n, proxy, instrumentation, the four auth pages, the floating frame with its four Sections (placeholder pages), account menu, PWA, page information, special pages, e2e, hosting wiring, and the parity audit.

**Architecture:** Laura holds only what an App owns: its descriptor `LAURA` (Sections, entries, logo, line), its words, its Polpo dressing (bound once, in thin files, to the shared pieces of Phase 1 through slots) and its pages. Everything both Apps need is a package piece: where Phase 1 left a piece in the Back Office that Laura also needs (the signed-out gate frame, the language switch, the Vitest presets, the environment and translation suites, the e2e suites), this phase moves it into a package and puts the Back Office on it in the same task, so `pnpm static:dupes` stays green. Laura reads the API only (no Prisma, no service), signs in through the API's Auth module, and registers nobody.

**Tech Stack:** Next 16 (Cache Components), next-intl 4, Base UI over shadcn through `@allonfire/ui`, Tabler icons, Vitest (node and Chromium/WebKit browser), Playwright e2e, Biome, knip, jscpd, Docker (build check). No new dependency: Laura declares only what the Back Office declares, at the same range; what Phase 1 and 2 left for Laura's later phases (`@allonfire/storage`, `@tanstack/react-query-devtools`, `@next/playwright`) is added by the phase that imports it.

**Spec:** docs/superpowers/specs/2026-11-17-laura-rebuild-design.md (Phase 3, "Parity rule", decisions 1, 2, 6, 7, 8, 9, 10)

## Global Constraints

- Tests first. A test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`. A constant's type comes from zod (`xSchema = z.enum(X)`, `type X = z.infer<typeof xSchema>`); a lookup table is `as const satisfies Record<K, V>`.
- Never `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify`, `localStorage`/`sessionStorage`: use core's helpers (`packages/config` imports nothing, core included: it reads files as text).
- Constants are one nested object per owner (`API`, `AUTH`, `IMAGE`, ...). A path or an error code is never a string literal, tests included. A Tailwind class list is never a constant: `cva`, or inline in `cn`.
- An env var starts with its owner: `STORAGE_`, `DATABASE_`, `AUTH_`, `API_`.
- A package never imports an App. Files go in `src/{environment,shared,features}`. A package's logic never names an App (ADR 0033).
- Server Components by default; `"use client"` only for hooks, event handlers, browser APIs or client libraries. A shared client piece takes strings and ReactNodes only; a Design function reaches it through a thin `"use client"` binding file in the App (Phase 1, "Slot rules").
- Next.js: read `packages/core/node_modules/next/dist/docs/` first, then Context7; check the Framework skills (`docs/guides/tooling.md`).
- A stored picture in a Next App shows its blur while it loads, except under 40 px (`images.md`). This phase draws no stored picture; Phase 4 does.
- Every form with fields is an AOF form (`useAOFForm`), never bare `useForm`. Components shared by Apps live in `packages/ui`, named `AOF...`; `packages/shadcn` is written only by the shadcn CLI. Pages are built through `/aof-design`, never plain `/impeccable`.
- A page of any Next App that reads or writes the API follows the data checklist in `docs/guides/next-apps.md`; every plan for one names each point. A page that waits has a skeleton at the loaded page's sizes with a browser test comparing heights; this phase adds no page that waits (see "Page data checklist" below).
- Database changes are Liquibase changesets (none here), never `prisma db push` or `prisma migrate`.
- exFAT drive: macOS writes `._*` sidecars; a new tool that scans folders ignores `**/._*`.
- Docs are plain English prose, no emoji, and the word for possibility is "might", for permission "can" or "is allowed to"; text diagrams use arrows and indentation.
- No `git commit` / `git add` in this plan: the owner commits by hand. Deleting the old Laura source is `rm`, left in the working tree.
- Anti-goals (spec): a piece copied from the Back Office into Laura; Laura reaching the database from Next (no Prisma client, no `*.service` import in any App); a package that names or imports an App; a Viewer branch anywhere.
- New dependency needs 200,000 weekly downloads (`tooling.md`): none added here (Task 1 states each kept one).

## Review Focus

1. **A Laura piece that clones a Back Office piece, or a package piece re-written in the App** (the parity rule). Pinned by Tasks 2, 5 and 11, where each shared piece lands in a package and the Back Office moves onto it in the same task, and by `pnpm static:dupes` in the last step of each task.
2. **An old Laura dependency, env name, folder, route or library that survives the rebuild, or a Prisma/service import in an App.** Pinned by `packages/config/local/tests/laura-app.test.ts` (Task 1) and the parity-audit test (Task 13), which also fails on any `pending` fate.
3. **The Upload Section's Role read in one place only.** The proxy (307 Home), the page (`minRole` option), the frame (row hidden) and the API must agree. Pinned by `upload-gate.test.ts` and `sections.test.ts` (Task 10) and `upload-gate.spec.ts` (Task 11); the API half is P0 Task 5's `LAURA_ADMIN_ROUTE` test, and Phase 5 adds the real route behind `requireApp(App.LAURA, Role.ADMIN)`.
4. **Re-entering the workspace breaks the repo** (lockfile, Turbo build env, knip, Biome, oxlint, CI build env, Docker build args, the Back Office's now-required `LAURA_URL`). Pinned by Task 3 (`environmentSuite` over both Apps), Task 12 (`local-files`, `workflows`, `prod-compose` tests) and `pnpm install --frozen-lockfile`.
5. **A shared piece drawn without its Design, or content under a notch.** A function slot crossing from a Server to a Client Component, a missing `--frame-*` token, a notice or toast kind with no dressing, a floating frame gap that eats the safe area. Pinned by Task 6's browser tests (one per binding), the floating-frame token check in Task 11 and Task 11's safe-area suite.

---

## Decisions this plan takes (correctable)

- **Phases 0 to 2 are assumed landed** (Task 0 checks the names). Where a name below says "fixed by Phase N, Task M", it is read from that plan, never invented here.
- **The shared e2e kit lives in `packages/ui`, not `packages/config`.** Phase 1 left it to this phase. `config` is a leaf that imports nothing, core included, and the suites need `AUTH`, `METADATA`, `SHARED_TRANSLATIONS` and the `AppDescriptor`; `ui` already depends on auth, core, database and design after Phase 1. The Vitest presets and the environment suite need none of that, so they live in `config`.
- **Both Apps' addresses are required in both Apps.** Spec decision 10 says `LAURA_URL` "becomes required to show the link"; read as an env rule, symmetric: Laura's `BACK_OFFICE_URL` is required too (its switcher lists the Back Office for a Back Office Admin). The Production compose gains the Back Office's `LAURA_URL` now; Laura's own compose service, host and Dokploy entry are Phase 7's (cutover), while the build wiring (Dockerfile arg, `deploy.yml`, CI) is here, since a Laura image is built the moment the App is in the workspace.
- **No 403 or 401 page.** Phase 1 decided that a Role too low is sent Home by the proxy and the page check and refused 403 by the API; the old `forbidden.tsx` and `unauthorized.tsx` (and `authInterrupts`) are deleted.
- **No JSON-LD, no sitemap.** Laura is unindexed (`ACCESS.APP_SETTINGS[App.LAURA].indexing`); spec decision 7's "JSON-LD if kept" is answered: not kept.
- **Memory's sub-menu holds Play and Leaderboard.** The Section's own path `/memory` is a real page (the game), not a redirect hub like Storage, and `/memory/leaderboard` sits under it. The shared `currentSubPage` takes the first page whose path prefixes the address, which would mark Play on the leaderboard; Task 4 makes it pick the longest match, with the Back Office's tests untouched.
- **`apps/laura/scripts/*` are deleted here, not in Phase 7.** Both import services that no longer exist (`photo.service`), so a workspace Laura could not type-check or pass knip with them.
- **Laura keeps `@allonfire/database`** for the `App` and `Role` enums, `ACCESS` and (in e2e) `FIXTURE`, exactly as the Back Office does; spec decision 1's "no database dependency" means no Prisma client and no service, which Task 1's guard test enforces for every App.
- **Placeholder pages, not skeleton stubs.** None of the four Sections reads or writes anything yet, so none waits: each is a static page inside the frame. Later phases replace the bodies and add each skeleton and height test with the data (named per page below).

## Page data checklist (this phase)

| Point (`next-apps.md`) | Home (Gallery), Favorites, Memory, Leaderboard | Upload |
|---|---|---|
| 1 hydration and TanStack | does not apply: no read yet (Phase 4 for Gallery and Favorites, Phase 6 for Memory and Leaderboard) | does not apply: Upload reads nothing (Phase 5 adds its Image list for the grid) |
| 2 both copies refreshed | does not apply: no write | does not apply: no write yet (Phase 5: `updateTag` + `invalidateQueries`) |
| 3 resource protection twice | the page gates itself (`signedInPage`) and the API judges (no route yet) | pinned here: page `minRole: Role.ADMIN`, proxy `gated`, frame row hidden (Task 10); API half is P0 Task 5 and Phase 5 |
| 4 resource changed | does not apply: no save | does not apply: no save yet |
| 5 lost and gone | does not apply: no resource | does not apply |
| 6 skeleton and height test | does not apply: the page is static and in the shell; the fallback while the Session check waits is the Section's `SectionLoading` (the checklist allows it "for a page with none yet"); the frame's account and switcher use ui's placeholders (Phase 1) | same |

What each later phase replaces: Phase 4 the bodies of `(signed-in)/page.tsx` and `favorites/page.tsx` (plus `GallerySkeleton`, `FavoritesSkeleton` and their height tests, `QUERY.GALLERY`, `GALLERY.*`); Phase 5 the body of `upload/page.tsx`; Phase 6 the bodies of `memory/page.tsx` and `memory/leaderboard/page.tsx`. The `generateMetadata`, the `signedInPage(...)` wrapper and the `minRole` option stay; `sections.test.ts` and `upload-gate.test.ts` keep pinning them.

## Parity rule: what Laura reuses from the Back Office, per mechanism

TanStack, private cache, `optimisticMutation`, `AOFQueryProvider`, `aofErrorMeta`, `AOFStorageImage`, `srcSetLoader`, `AOFPictureGuard`, `heic-to`: no page of this phase uses them; the shell mounts `AOFQueryProvider` through `AOFLocaleDocument` (Phase 1, Task 17), so Phase 4 starts with the provider in place. The mechanisms this phase does use are named per task: `AOFAppFrame`, `AOFAccount`, `AOFAppSwitcher`, `AOFSignIn` set, notices, PWA pieces (Phase 1), `aofAppMetadata`/`aofAppImages`/`aofManifest` (Phase 1), `requireAppSession({ minRole })` and `withSignInGate({ gated })` (Phase 1, Task 8), `sectionGuards`, `proxyMatcherSuite`, `renderInUi`. What Laura lacked and this phase adds to a package: `AOFGateFrame`, `AOFLanguageSwitch`, `sectionPaths`, `gatedSections`, the Vitest presets, `environmentSuite`, `translationsSuite`, the four e2e suites and the e2e page helpers.

---

## File structure

Deleted (the old Laura; `git ls-files apps/laura` lists all 176, and Task 13's table gives each one a fate): `apps/laura/src/**`, `apps/laura/messages/`, `apps/laura/public/**` (all but a new `favicon.ico`), `apps/laura/scripts/`, `apps/laura/e2e/login.spec.ts`, `apps/laura/.env.example` (rewritten), the `apps/laura/seed-photos/` line of `.gitignore`.

Created in `apps/laura` (responsibility in brackets):

- `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `components.json`, `.gitignore`, `.env.example`, `AGENTS.md`, `CLAUDE.md`, `README.md` [the App's package]; `vitest.config.ts`, `vitest.browser.config.ts`, `vitest.browser.setup.ts`, `playwright.config.ts` [test configs over config's presets]; `public/favicon.ico`.
- `src/environment/environment.ts` (+ `tests/environment.test.ts`) [env, owner-prefixed]; `src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/proxy.ts`, `src/proxy.test.ts`.
- `src/shared/constants/laura.ts` [`LAURA`, `SECTION`, `SECTIONS`]; `src/shared/constants/page-information.ts` [the `aofAppMetadata` and `aofAppImages` binding]; `src/shared/constants/action-dressing.tsx`; `src/shared/components/polpo-toaster.tsx`, `polpo-mark.tsx`; `src/shared/tests/{render-in-app.tsx,translators.ts,msw/handlers.ts}`.
- `src/features/i18n/{routing,navigation,request}.ts`, `translations/{en,it}.json`, `tests/translations.test.ts`.
- `src/features/navigation/{components/{frame-breadcrumb,section-loading}.tsx,constants/section-row.ts,utils/signed-in-page.tsx,tests/sections.test.ts}`.
- `src/features/auth/{components/polpo-gate.tsx,constants/dressing.tsx}`; `src/features/errors/components/{polpo-notice-frame,error-notice,not-found-notice}.tsx`; `src/features/pwa/components/{install-hint-card,offline-card,install-hint,offline-banner,offline-notice}.tsx`; `src/features/metadata/utils/image-fonts.ts`.
- `src/app/`: `globals.css`, `manifest.ts`, `robots.ts`, `icon.tsx`, `apple-icon.tsx`, `global-error.tsx`, `launch/[screen]/route.tsx`, `logo/[file]/route.ts`, `manifest-icon/[icon]/route.ts`, `[locale]/{layout,error,not-found,opengraph-image,twitter-image}.tsx`, `[locale]/{sign-in,forgot-password,reset-password,email-verified,offline}/page.tsx`, `[locale]/[...rest]/page.tsx`, `[locale]/(signed-in)/{layout,not-found}.tsx`, `[locale]/(signed-in)/{page,favorites/page,memory/page,memory/leaderboard/page,upload/page}.tsx`.
- `e2e/{pages.ts,safe-area.spec.ts,sign-in.spec.ts,frame.spec.ts,head.spec.ts,pwa.spec.ts,upload-gate.spec.ts,floating-frame.spec.ts}`.

Created in packages: `packages/config/local/tests/{laura-app,laura-parity-audit}.test.ts`; config `tests/vitest/{app-vitest,environment-suite}.ts` (+ test); ui `features/auth/components/aof-gate-frame.tsx`, `features/navigation/components/aof-language-switch.tsx`, `shared/tests/translations-suite.ts`, `features/app/tests/e2e/{app-pages,sign-in-suite,frame-suite,safe-area-suite,head-suite}.ts`; design `apps/laura/laura-logo.ts`, `apps/back-office/back-office-logo.ts`; docs `docs/superpowers/specs/2026-11-17-laura-parity-audit.md`.

Modified (grouped by task): see each task. The Back Office is modified only to move onto a new package piece or to require `LAURA_URL`; no Back Office test changes except an import path or the shared-suite call, and its e2e specs stay green on four projects.

---

### Task 0: Reconcile and baseline

**Files:** none; notes only.

**Interfaces:** Consumes every name "fixed by Phase 0/1/2" below.

- [ ] Step 1: Check the earlier phases landed (stop and report which one is unfinished if a line prints nothing): `git grep -l "export type AppDescriptor" -- packages/ui/src`; `git grep -l "aofAppMetadata" -- packages/core/src`; `git grep -l "aofAppImages" -- packages/ui/src`; `git grep -l "aofCreateApi" -- packages/core/src`; `git grep -l "nextApiEnv" -- packages/core/src`; `git grep -l "AOFAuthDressing" -- packages/ui/src`; `git grep -l "AOFLocaleDocument" -- packages/ui/src`; `git grep -l "proxyMatcherSuite" -- packages/core/src`; `git grep -l "sectionGuards" -- packages/ui/src`; `git grep -l "gated" -- packages/auth/src/features/next/utils/with-sign-in-gate.ts`; `git grep -l "POLPO_SHARE_CARD" -- packages/design/src`; `git grep -l "loadPolpoImageFonts" -- packages/design/src`; `git grep -l "POLPO_CARD_BACK" -- packages/design/src`; `git grep -n "frame-gap" -- packages/design/src/designs/polpo/theme.css`; `git grep -n "Role.VIEWER" -- packages apps ':!apps/laura'` must print nothing. If a Phase 1 or 2 name differs from this plan's spelling, the code wins: rename it here and nowhere else.
- [ ] Step 2: Reconcile the sources this plan read: re-read `apps/back-office/src/app`, `src/shared/constants/back-office.ts`, `src/features/navigation`, `e2e/pages.ts`, `e2e/{safe-area,sign-in,frame,head}.spec.ts` as Phase 1 left them (`git log -5 -- apps/back-office`), and note any piece Phase 1 already made shared that a later task below moves (then skip that move).
- [ ] Step 3: Save the old file list for the audit: `git ls-files apps/laura > <scratchpad>/old-laura-files.txt` (176 lines when this plan was written).
- [ ] Step 4: Baseline: `pnpm --filter @allonfire/back-office check-types`, `pnpm --filter @allonfire/back-office test`, `pnpm --filter @allonfire/back-office test:browser`, `pnpm --filter @allonfire/ui test`, `pnpm --filter @allonfire/config test`, `pnpm static:dupes`, `pnpm static:knip`, `pnpm static:knip-production`. Write the pass counts in the notes; any red is fixed or reported first.

### Task 1: Guard tests, workspace re-entry, the empty shell and its package

**Files:**
- Create: `packages/config/local/tests/laura-app.test.ts`, `apps/laura/.gitignore`
- Modify: `pnpm-workspace.yaml` (delete the three lines of the `!apps/laura` pause), `apps/laura/package.json` (rewritten), `.gitignore` (delete the `apps/laura/seed-photos/` lines), `packages/config/turbo.json` (config's `test` inputs: nothing new, `apps/**` is already listed), `packages/config/local/tests/knip-config.test.ts` (reword the `OUTSIDE_WORKSPACE` doc comment: no folder is paused now, the test stays)
- Delete: everything under "Deleted" in the File structure
- Regenerate: `pnpm-lock.yaml`

**Interfaces:** Produces `@allonfire/laura` as a workspace package whose scripts are the Back Office's with Laura's port (3200), and the guard every later task keeps green.

- [ ] Step 1: Write `laura-app.test.ts` (unit; reads files as text, no JSON parser):

```ts
// @module-tag unit
const LAURA = read("apps/laura/package.json");
const BACK_OFFICE = read("apps/back-office/package.json");
const BANNED = ["framer-motion", "lucide-react", "react-hook-form", "sonner", "heic2any", "better-auth", "@better-auth/prisma-adapter", "@next/bundle-analyzer", "sharp", "tsx"] as const;
const TOP = ["app", "environment", "features", "shared"] as const;           // src/ folders
const ROOT_FILES = ["instrumentation-client.ts", "instrumentation.ts", "proxy.test.ts", "proxy.ts"] as const;
const DEPENDENCY = /^\s{4}"([^"]+)": "([^"]+)",?$/gm;

it("is a workspace package again", () => {
  expect(read("pnpm-workspace.yaml")).not.toMatch(OUTSIDE_WORKSPACE_LAURA); // no "!apps/laura"
  expect(LAURA).toContain('"name": "@allonfire/laura"');
});
it.each(BANNED)("declares no %s", (name) => expect(LAURA).not.toContain(`"${name}"`));
it("runs on its Local port, dev and start", () => {
  expect(LAURA).toContain(`next dev --port ${LOCAL.PORT.LAURA}`);
  expect(LAURA).toContain(`next start --port ${LOCAL.PORT.LAURA}`);
});
it("builds the service worker after next build", () => expect(LAURA).toContain("pwa:build"));
it("declares every shared dependency at the Back Office's range", () => { /* each name:range of LAURA, not workspace:*, equals BACK_OFFICE's */ });
it("keeps src to environment, shared, features and app, plus its four root files", () => {
  expect(readdirSync("apps/laura/src").filter(notSidecar).sort()).toEqual([...TOP, ...ROOT_FILES].sort());
});
it("keeps no old top-level folder, script, message file or env name", () => {
  for (const gone of ["scripts", "messages", "src/lib", "src/components", "src/env.ts", "src/i18n"]) expect(existsSync(`apps/laura/${gone}`)).toBe(false);
});
it.each(APPS)("%s imports no Prisma client and no service", () => { /* glob apps/*/src/**/*.{ts,tsx}, skip tests/ and ._*, none contains "@allonfire/database/features/prisma" or ".service\"" */ });
```

- [ ] Step 2: Run `pnpm --filter @allonfire/config exec vitest run local/tests/laura-app.test.ts`: FAIL (workspace excludes Laura, the old package declares the banned set).
- [ ] Step 3: Implement. `rm -r apps/laura/{src,messages,scripts,public,e2e/login.spec.ts,.env.example}` (keep `public/` to write `favicon.ico` in Task 7; the old PNG and SVG files go now), create the four-file `src/` skeleton (`src/environment`, `src/shared`, `src/features`, `src/app` as empty folders get their files in later tasks: this step needs only `.gitkeep`-free placeholders, so create the root files with Task 3's content when that task runs; until then the structure test is expected to stay red on this one assertion, and Task 3's last step turns it green). Rewrite `apps/laura/package.json` as the Back Office's with these differences, nothing else: `name` `@allonfire/laura`; ports `3200` in `dev` and `start`, `PORT=3220` in `preview`; `tailwind:canonicalize` `--css apps/laura/src/app/globals.css --dir apps/laura/src`, and `tailwind:fix` `pnpm tailwind:canonicalize && biome check --write src` (Laura scans its own source only: ui's classes are canonical against the Back Office's theme and both Designs define the same token names, which `design-contract.test.ts` pins; reconcile: if `pnpm static:tailwind` flags a ui file for Laura, add `--dir packages/ui/src` and run both Apps' fixes with `--workspace-concurrency=1`); dependencies: `@allonfire/{api,auth,core,database,design,ui}` as `workspace:*`, `@t3-oss/env-nextjs`, `@tabler/icons-react`, `@tanstack/react-query` (ui's required peer), `class-variance-authority`, `hono` (core's `aofCreateApi` imports `hono/client` from the App), `next`, `next-intl`, `next-themes`, `nuqs` (core's and ui's peer), `react`, `react-dom`, `zod`; devDependencies: `@allonfire/config`, `@lingual/i18n-check`, `@playwright/test`, `@tailwindcss/postcss`, `@types/node`, `@types/react`, `@types/react-dom`, `@vitest/browser-playwright`, `babel-plugin-react-compiler`, `msw`, `playwright`, `typescript`, `vitest`, `vitest-browser-react`, every one at the Back Office's range. Not carried, each with its reason in Task 13's table: `lucide-react` (Tabler), `@tanstack/react-query-devtools`, `@next/playwright` (Phase 4 adds it with its first `instant()` test), `@allonfire/storage` (a transpile entry only; Phase 4 or 5 lists it when a file imports it), `sharp`, `tsx`, `@next/bundle-analyzer`, the old `analyze`, `seed-photos` and `dev:tailscale` scripts (root `pnpm dev:tailscale` serves Laura as a Service, ADR 0021), and `--webpack` (Turbopack, as the Back Office). Copy `apps/back-office/.gitignore`. Edit the workspace file and the root `.gitignore`. Run `pnpm install` (rebuilds `pnpm-lock.yaml`), then `pnpm install --frozen-lockfile`: both exit 0.
- [ ] Step 4: Run the Step 2 command: PASS except the `src` structure assertion, which Task 3 closes. Run `pnpm --filter @allonfire/config exec vitest run local/tests/knip-config.test.ts local/tests/root-scripts.test.ts`: PASS (reconcile: `root-scripts.test.ts` filters out `apps/laura/` readers; remove that filter in Task 12 once Laura's files are clean).

### Task 2: Test presets and suites in packages; the Back Office moves onto them

Review Focus 1: three files every App would otherwise copy (Vitest config, env test, translation rules). jscpd scans `apps/**`, config files included.

**Files:**
- Create: `packages/config/tests/vitest/app-vitest.ts`, `packages/config/tests/vitest/environment-suite.ts`, `packages/config/tests/vitest/tests/app-vitest.test.ts`, `packages/ui/src/shared/tests/translations-suite.ts`, `packages/ui/src/shared/tests/translations-suite.test.ts`
- Modify: `packages/config/package.json` (export keys `./tests/vitest/app`, `./tests/vitest/environment-suite`), `packages/ui/package.json` (`./shared/tests/translations-suite`), `knip.jsonc` (the three suite files in `ignoreIssues`, reason "test helpers the Apps' tests call, through export keys; production mode leaves every test out", beside the existing `computed-style` entries), Back Office `vitest.config.ts`, `vitest.browser.config.ts`, `src/environment/tests/environment.test.ts`, `src/features/i18n/tests/translations.test.ts`

**Interfaces:**
- Produces `aofAppVitest(srcDir: string): { appViteOptions: UserConfig; vitestConfig: UserConfig }` (the Back Office's `appViteOptions` and merged config: `@` alias to `srcDir`, `oxc.jsx.runtime: "automatic"`, `test.server.deps.inline: ["next-intl"]`) and `aofAppBrowserVitest({ appViteOptions, setupFile }): UserConfig` (the browser preset plus `define["process.env"]` holding `NEXT_PUBLIC_API_URL: LOCAL.URL.TEST_API` written as a template string, since config cannot import `stringifyJson`, and `test.setupFiles: [setupFile]`).
- Produces `environmentSuite({ importEnv, stub, required, optional, buildVariables, authUrl, examplePath })` registering the Back Office's `environment.test.ts` cases (reconcile: re-read it, the remote-address cases arrived with the tailnet work): loads at runtime with the App's variables; each name in `required` is refused when unset and when not a URL (message `Invalid environment variables`); each name in `optional` (`NEXT_PUBLIC_API_REMOTE_URL`) starts when unset and is refused when it is not a URL; Turbo hands the build every name in `buildVariables` (`turbo.json` read as text, as the existing config tests do); `.env.example` holds `API_AUTH_URL="<authUrl>"`.
- Produces `translationProblems({ en, it, names, toastKeys, sample }): { onlyNames; longErrors; longNotes; longToasts }` (arrays of offending strings, from the Back Office's `translations.test.ts`: no entry that is only a name, errors within `MESSAGE_LENGTH.ERROR`, notes within `MESSAGE_LENGTH.NOTE`, each toast key within `MESSAGE_LENGTH.TOAST` once rendered) and `translationsSuite({...})` which asserts each array is empty in both languages.

- [ ] Step 1: Tests. `app-vitest.test.ts`: `aofAppVitest("/x/src").appViteOptions.resolve.alias["@"]` is `"/x/src"`; the config's `test.server.deps.inline` contains `"next-intl"`; `aofAppBrowserVitest(...)`'s `define["process.env"]` contains `LOCAL.URL.TEST_API` and `test.setupFiles` equals the given file. `translations-suite.test.ts`: `translationProblems` with `en: { A: { error: "x".repeat(MESSAGE_LENGTH.ERROR + 1) } }` reports one `longErrors`; a value equal to a name in `names` reports one `onlyNames`; a clean pair reports four empty arrays.
- [ ] Step 2: Run `pnpm --filter @allonfire/config exec vitest run tests/vitest/tests/app-vitest.test.ts` and `pnpm --filter @allonfire/ui exec vitest run src/shared/tests/translations-suite.test.ts`: FAIL (modules missing).
- [ ] Step 3: Move the logic out of the Back Office files (`git mv` is not needed: write the package files from them, then reduce the Back Office files). The Back Office keeps its own cases only: the `SignIn.note.unverified` assertion and its `TOAST_KEYS` list; its `environment.test.ts` becomes one `environmentSuite({ ... })` call plus nothing else (its `refuses to start without the Back Office's own address` case is `required`'s first entry).
- [ ] Step 4: Run both new tests: PASS; then the Back Office's `environment.test.ts`, `translations.test.ts` and, for the configs, `pnpm --filter @allonfire/back-office test` and `test:browser`: same pass counts as Task 0's baseline. Prove the original text is gone from the Back Office: the three files hold one call each.

### Task 3: The App skeleton: addresses, env, config files, instrumentation; the Back Office's `LAURA_URL` becomes required

**Files:**
- Modify: `packages/config/local/addresses.ts` (`PORT.LAURA_E2E: 3210`, `ADDRESS.LAURA_E2E`), `packages/config/local/tests/{addresses,local-files,env-examples}.test.ts`, `turbo.json` (`build.env` gains `LAURA_URL`), `apps/back-office/src/environment/environment.ts` (`LAURA_URL: z.url()`, drop `.optional()`, rewrite its doc comment: the switcher lists Laura for every Admin who enters it), `apps/back-office/.env.example` (comment `# Laura: its own address, build and runtime match`), `apps/back-office/playwright.config.ts` (`env` adds `LAURA_URL: LOCAL.URL.LAURA_E2E`), the Back Office's `environment.test.ts` call (`required` gains `LAURA_URL`, `buildVariables` too)
- Create (Laura): `src/environment/environment.ts`, `src/environment/tests/environment.test.ts`, `.env.example`, `tsconfig.json`, `postcss.config.mjs`, `components.json`, `next.config.ts`, `AGENTS.md`, `CLAUDE.md`, `vitest.config.ts`, `vitest.browser.config.ts`, `vitest.browser.setup.ts`, `playwright.config.ts`, `src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/shared/tests/msw/handlers.ts`, `src/app/globals.css`

**Interfaces:**
- Consumes: `nextAuthEnv` (`@allonfire/auth/environment/next-environment`), `telemetryEnv`, `runtimeEnvSchema` (core), `nextApiEnv` (fixed by Phase 1, Task 3), `AOFCreateNextConfig`, `AOFWithLocalizedNotFound`, `aofBaseRouting` (Task 1 of Phase 1), `aofPlaywrightConfig`, `aofAppVitest`, `aofAppBrowserVitest`, `environmentSuite` (Task 2).
- Produces: `LOCAL.PORT.LAURA_E2E = 3210`, `LOCAL.URL.LAURA_E2E = "http://localhost:3210"`; Laura's `env` (`@/environment/environment`): `extends: [nextAuthEnv, telemetryEnv, nextApiEnv]`, `server: { BACK_OFFICE_URL: z.url(), LAURA_URL: z.url() }`, `experimental__runtimeEnv: { NEXT_PUBLIC_API_REMOTE_URL: process.env.NEXT_PUBLIC_API_REMOTE_URL, NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL, NODE_ENV: process.env.NODE_ENV }` (the remote address is `nextApiEnv`'s optional, Local-only value from Phase 1, Task 3: with it set in `.env.development.local`, a Laura page opened on the tailnet address calls the API's tailnet address through `apiUrlFor`, as the Back Office does; unset, as in Production, it is always `NEXT_PUBLIC_API_URL`), `shared: runtimeEnvSchema`. Old names dropped: `BETTER_AUTH_*`, `DATABASE_URL`, `LAURA_VIEWER_*`, `MINIO_*`.

- [ ] Step 1: Tests. `addresses.test.ts` adds `LAURA_E2E: "http://localhost:3210"`. `local-files.test.ts` replaces Laura's two entries: `apps/laura/.env.example` holds `NEXT_PUBLIC_API_URL="${LOCAL.URL.API}"`, `API_URL="${LOCAL.URL.API}"`, `LAURA_URL="${LOCAL.URL.LAURA}"`, `BACK_OFFICE_URL="${LOCAL.URL.BACK_OFFICE}"`; `apps/laura/package.json` holds `next dev --port ${LOCAL.PORT.LAURA}` and `next start --port ${LOCAL.PORT.LAURA}`; the Back Office's example now holds its `LAURA_URL` line (kept). `env-examples.test.ts` adds `apps/laura/.env.example` to `OWNERS` reading `apps/laura/src/environment/environment.ts`, `packages/auth/src/environment/next-environment.ts`, `packages/core/src/environment/telemetry-environment.ts` and `packages/core/src/environment/next-api-environment.ts` (the Back Office's entry gains the last one if Phase 1 did not; reconcile), and its comment "Laura keeps its old names" is deleted. Laura's `environment.test.ts` is one `environmentSuite({ importEnv: () => import("../environment"), stub: { AUTH_APP: App.LAURA, API_AUTH_URL: \`${LOCAL.URL.API}${API.PATH.AUTH}\`, NEXT_PUBLIC_API_URL: LOCAL.URL.API, API_URL: LOCAL.URL.API, LAURA_URL: LOCAL.URL.LAURA, BACK_OFFICE_URL: LOCAL.URL.BACK_OFFICE }, required: ["LAURA_URL", "BACK_OFFICE_URL", "API_URL"], optional: ["NEXT_PUBLIC_API_REMOTE_URL"], buildVariables: ["API_URL", "BACK_OFFICE_URL", "LAURA_URL", "NEXT_PUBLIC_API_REMOTE_URL", "NEXT_PUBLIC_API_URL"], authUrl: ..., examplePath: new URL("../../../.env.example", import.meta.url) })`.
- [ ] Step 2: Run `pnpm --filter @allonfire/config test` and `pnpm --filter @allonfire/laura exec vitest run src/environment`: FAIL.
- [ ] Step 3: Implement. `.env.example` follows `deployment.md`'s env-file rule (header of three comment lines, blocks by owner in alphabetical order, keys alphabetical, every value quoted): blocks `API` (`API_AUTH_URL`, `API_URL`, the commented `NEXT_PUBLIC_API_REMOTE_URL="https://api.<tailnet>.ts.net"` under the Back Office's two-line hint, then `NEXT_PUBLIC_API_URL`), `Auth` (`AUTH_APP="LAURA"`, commented `AUTH_COOKIE_DOMAIN`), `Back Office` (its address), `Laura` (its own address: build and runtime match), `Telemetry` (`TELEMETRY_SERVICE_NAME="allonfire-laura"`), the Back Office's blocks as the model. `tsconfig.json`, `postcss.config.mjs`, `components.json`, `AGENTS.md`, `CLAUDE.md`: the Back Office's files (the shadcn CLI and `next dev` read the first and write the last two; they are not code). `next.config.ts`:

```ts
export default AOFCreateNextConfig(AOFWithLocalizedNotFound({}, { routing }), {
  indexing: ACCESS.APP_SETTINGS[App.LAURA].indexing,
  intl: { requestConfig: "./src/features/i18n/request.ts" },
  transpile: ["@allonfire/auth", "@allonfire/database", "@allonfire/design", "@allonfire/shadcn", "@allonfire/storage", "@allonfire/ui"],
});
```
  No `withProviderPictures` (Laura has no sign-in provider pictures: nobody registers and no Google sign-in), no body-size raise (Phase 5 sets Upload's own), no rewrites or `images.remotePatterns` (pictures reach the browser through signed links, `images.md`). `routing` comes from `./src/features/i18n/routing` (Task 4 creates it; until then `next.config.ts` is type-checked in Task 4's last step). `vitest.config.ts`: `aofAppVitest(fileURLToPath(new URL("./src", import.meta.url)))`; `vitest.browser.config.ts` over `aofAppBrowserVitest`; `vitest.browser.setup.ts`: the stylesheet import, `startMsw(...handlers)`; `handlers.ts` exports an empty typed array until Phase 4. `playwright.config.ts`: `aofPlaywrightConfig({ apiPath: API.PATH, app: "laura", env: { AUTH_APP: App.LAURA, BACK_OFFICE_URL: LOCAL.URL.BACK_OFFICE_E2E, LAURA_URL: LOCAL.URL.LAURA_E2E }, localStorage: <the Install hint dismissed, as the Back Office's>, port: LOCAL.PORT.LAURA_E2E })`. `instrumentation.ts` and `instrumentation-client.ts`: the Back Office's lines (Next reads both from the App; if jscpd flags either, wrap in `jscpd:ignore-start`/`-end` with the reason "Next reads this file from the App itself"). `globals.css`: `@import "@allonfire/ui/styles/base.css";`, `@import "@allonfire/design/apps/laura/styles.css";`, `@source "../";` (P2, Contract item 7). Ask no impeccable here: the Design is Phase 2's.
- [ ] Step 4: Run the Step 2 commands: PASS, now including the Task 1 structure assertion once Task 4 and 8 file the rest (re-run it at Task 10). Run `pnpm --filter @allonfire/back-office exec vitest run src/environment` and its browser run: green. Then `pnpm static:dupes`: if the two env files or the two Playwright configs are flagged, the `server` and `env` literals differ, the rest is one call each; wrap only what Next forces (the `process.env.NEXT_PUBLIC_API_URL` literal) in `jscpd:ignore` with that reason.

### Task 4: Logos, the `LAURA` descriptor, Section helpers and the catalogues

**Files:**
- Create: `packages/design/src/apps/laura/laura-logo.ts`, `packages/design/src/apps/back-office/back-office-logo.ts`, `packages/design/src/apps/tests/logos.test.ts`, `apps/laura/src/shared/constants/laura.ts`, `apps/laura/src/shared/tests/laura.test.ts`, `apps/laura/src/features/i18n/{routing,navigation,request}.ts`, `translations/{en,it}.json`, `tests/translations.test.ts`, `apps/laura/src/shared/tests/{translators,render-in-app}.ts(x)`
- Modify: `packages/design/package.json` (keys `./apps/laura/laura-logo`, `./apps/back-office/back-office-logo`), `packages/ui/src/features/navigation/utils/sections.ts` (+ its test), `apps/back-office/src/shared/constants/back-office.ts` (`LOGO` re-pointed to `BACK_OFFICE_LOGO`), `apps/back-office/src/shared/constants/apps.ts` (Laura's entry becomes `{ mark: { logo: LAURA_LOGO }, name: LAURA_LOGO.name }`, replacing `IconLibraryPhoto`), `apps/back-office/src/proxy.ts` (uses the new helpers)

**Interfaces:**
- Consumes: `AppDescriptor`, `AppSection`, `AppEntry` (fixed by Phase 1, Task 7), `POLPO_IMAGE_COLOR.BANNER`, `POLPO_IMAGE_FONT.FAMILY` (Phase 2, Tasks 3 and 6), `aofBaseRouting`, `aofBaseNavigation` (Phase 1, Task 1), `aofTranslators`.
- Produces: `LAURA_LOGO: AppLogo` and `BACK_OFFICE_LOGO: AppLogo`; ui `sectionPaths(app): string[]` (paths in menu order) and `gatedSections(app): { path: string; minRole: Role }[]` (Sections that carry `minRole`), and `currentSubPage` choosing the longest matching page path; `LAURA` and `SECTION`, `SECTIONS` in `@/shared/constants/laura`; `routing` and `{ Link, redirect, usePathname, useRouter, getPathname, languageLinks }` re-exports of core's base ones; `enT`, `itT`; `renderInApp`.

`LAURA` in full shape (the file holds only data and the three imports of icons and constants):

```ts
export const PAGE = { FAVORITES: "/favorites", LEADERBOARD: "/memory/leaderboard", MEMORY: "/memory", UPLOAD: "/upload" } as const;
export const SECTION = {
  FAVORITES: { icon: IconPhotoStar, label: "favorites", path: PAGE.FAVORITES },
  GALLERY: { icon: IconPhoto, label: "gallery", path: AUTH.PAGE.HOME },          // Home is the Gallery
  MEMORY: { icon: IconCards, label: "memory", path: PAGE.MEMORY, pages: [
    { icon: IconCards, label: "play", path: PAGE.MEMORY },
    { icon: IconTrophy, label: "leaderboard", path: PAGE.LEADERBOARD }] },
  UPLOAD: { icon: IconUpload, label: "upload", minRole: Role.ADMIN, path: PAGE.UPLOAD },
} as const satisfies Record<string, AppSection>;
export const SECTIONS = [SECTION.GALLERY, SECTION.FAVORITES, SECTION.MEMORY, SECTION.UPLOAD] as const;
export const LAURA = { PAGE, app: App.LAURA, entries: {...}, line: POLPO_IMAGE_COLOR.light.coral, logo: LAURA_LOGO,
  name: LAURA_LOGO.name, sections: SECTIONS, shareImageAlt: `${LAURA_LOGO.name}, ${BRAND.NAME}` } as const satisfies AppDescriptor & Record<string, unknown>;
```
`entries` gives `[App.LAURA]` `{ mark: { logo: LAURA_LOGO }, name: LAURA_LOGO.name }` and `[App.BACK_OFFICE]` `{ mark: { logo: BACK_OFFICE_LOGO }, name: BACK_OFFICE_LOGO.name }` (`Record<App, AppEntry>` fails to compile for a new App). Favorites is drawn with `IconPhotoStar`, never a heart (`CONTEXT.md`: Favorite). Reconcile: if Phase 1 left `back-office.ts` and `sections.ts` importing each other, note it in the Back Office's task and keep Laura's constants in one file (no cycle).

- [ ] Step 1: Tests.
  - `logos.test.ts` (design): `LAURA_LOGO` equals `{ banner: POLPO_IMAGE_COLOR.BANNER, fontFamily: POLPO_IMAGE_FONT.FAMILY, name: "Laura" }`; `BACK_OFFICE_LOGO` equals the Back Office's old `LOGO` (`banner: ["#00588f", JAPAN_IMAGE_COLOR.light.primary, JAPAN_IMAGE_COLOR.dark.primary]`, the Japan face, name `"Back Office"`); `aofLogoSvg({ app: LAURA_LOGO, layout: SQUARE, scheme: AUTO })` contains `Laura`.
  - ui `sections.test.ts` adds: `sectionPaths(app)` equals the rows' paths in order; `gatedSections(app)` equals `[{ path: "/upload", minRole: Role.ADMIN }]` for a descriptor whose last Section has it and `[]` for one with none; `currentSubPage(memory, "/memory/leaderboard")?.label` is `"leaderboard"` and `currentSubPage(memory, "/memory")?.label` is `"play"`; the Back Office's existing cases pass unedited.
  - `laura.test.ts`: `LAURA.app` is `App.LAURA`; `SECTIONS[0].path` is `AUTH.PAGE.HOME`; the paths are `["", "/favorites", "/memory", "/upload"]`; only Upload has `minRole`, and it is `Role.ADMIN`; every Section and page `label` is a key of `EN.Navigation` and of `IT.Navigation`; `LAURA.entries` has a row for every `App` (`objectValues(App)`) and Laura's mark is `{ logo: LAURA_LOGO }`; `LAURA.name` is `"Laura"`; `shareImageAlt` holds both `LAURA.name` and `BRAND.NAME`.
  - `translations.test.ts` is one `translationsSuite` call (`names: [LAURA.name, BRAND.NAME, LAURA.shareImageAlt]`, `toastKeys: []` until a toast exists) plus `EN.Metadata.description` and `IT.Metadata.description` are non-empty.
- [ ] Step 2: Run `pnpm --filter @allonfire/design exec vitest run src/apps`, `pnpm --filter @allonfire/ui exec vitest run src/features/navigation`, `pnpm --filter @allonfire/laura exec vitest run src/shared src/features/i18n`: FAIL.
- [ ] Step 3: Implement. `sections.ts`: add the two helpers, change `currentSubPage` to the page whose `isCurrentSection` matches with the longest `path`. Catalogues, English first, Italian twin: `Metadata.description` ("Our private Gallery and Memory game." / "La nostra Gallery privata e il gioco Memory."), `Navigation` with `gallery` Gallery/Gallery, `favorites` Favorites/Preferiti, `memory` Memory/Memory, `upload` Upload/Carica, `play` Play/Gioca, `leaderboard` Leaderboard/Classifica; nothing else (the shared copy is core's `Common`, Phase 1; the old Laura keys are not carried). `routing.ts` and `navigation.ts` re-export core's (Phase 1, Task 1). `request.ts` is next-intl's loader table and names its own JSON files, so it is the Back Office's text with Laura's imports: if jscpd flags it, wrap the table in `jscpd:ignore` with the reason "next-intl loads each language from files beside this one". `translators.ts` is `aofTranslators({ en: EN, it: IT })`; `render-in-app.tsx` is `renderInUi({ messages: EN, ...options })` (Phase 1, Task 6). Back Office: re-point `LOGO` and Laura's entry, and its `proxy.ts` calls `sectionPaths(BACK_OFFICE)` and `gatedSections(BACK_OFFICE)`.
- [ ] Step 4: Run the Step 2 commands: PASS. Then `pnpm --filter @allonfire/back-office test`, `test:browser` (the switcher and Users list draw Laura's logo now: the Users and app-switcher browser tests stay green; reconcile any test that named `IconLibraryPhoto`), `pnpm --filter @allonfire/laura check-types` (type-checks `next.config.ts` and the catalogues; the `app` folder is empty so far, so run it again at Task 10), `pnpm static:i18n`.

### Task 5: The signed-out gate frame and the language switch move to ui

Review Focus 1: Phase 1 left the Back Office's `TicketGate` shell and `language-switch.tsx` in the Back Office as Japan-only; Laura's gate needs the same skeleton (page, control bar with the language switch and the theme toggle) in another dress.

**Files:**
- Create: `packages/ui/src/features/auth/components/aof-gate-frame.tsx`, `packages/ui/src/features/navigation/components/aof-language-switch.tsx`, tests `packages/ui/src/features/auth/tests/aof-gate-frame.test.tsx`, `packages/ui/src/features/navigation/tests/aof-language-switch.test.tsx`
- Move: `apps/back-office/src/features/auth/components/language-switch.tsx` into `aof-language-switch.tsx` (the Back Office file is deleted)
- Modify: `apps/back-office/src/features/auth/components/ticket-gate.tsx` (becomes a dress over `AOFGateFrame`), `packages/core/src/features/next/i18n/translations/{en,it}.json` (`Common.Auth.Gate.language`, `Common.Auth.Gate.theme`, moved from the Back Office's `SignIn.language` and `SignIn.theme` when Phase 1 left them there; reconcile), the Back Office JSONs, `packages/ui/package.json`

**Interfaces:**
- Produces `AOFLanguageSwitch({ href, label, className?, linkClassName: { current: string; idle: string } })` (Server Component; links from `aofBaseNavigation.languageLinks`, `aria-current` on the current language, a Tabler `IconLanguage`) and `AOFGateFrame({ children, header?, page, wall?, className? })` (Server Component: `AOFPage layout="centered"`, the `wall` behind, a `max-w-md` column with `header` then `children`, and the bottom control bar holding the language switch and `AOFThemeToggle`, labelled from `Common.Auth.Gate`; the language link look is `AOFGateFrameProps["languageLinkClassName"]`, passed by the Design). The Back Office's `TicketGate` passes `header={<DepartureBoard .../>}`, `wall={<BrushKanji .../>}` and the Japan link classes; its markup and pixels do not change.

- [ ] Step 1: Tests. `aof-language-switch.test.tsx`: renders one link per `I18N.BASE_LANGUAGES` entry, the current locale's has `aria-current="page"` and the others none, each `href` is `languageLinks(href, locale)`'s, `linkClassName.current` is on the current and `.idle` on the others. `aof-gate-frame.test.tsx` (stub `header`, `wall`, `children`): all three appear, the language navigation is labelled `Common.Auth.Gate.language`, the theme toggle `Common.Auth.Gate.theme` (through `createTranslator`, never retyped), and the frame draws no registration link. The Back Office's `sign-in.test.tsx` and `departure-board`/`station-sign` browser tests stay untouched and green.
- [ ] Step 2: Run `pnpm --filter @allonfire/ui exec vitest run src/features/auth/tests/aof-gate-frame.test.tsx src/features/navigation/tests/aof-language-switch.test.tsx`: FAIL.
- [ ] Step 3: Implement (recipe of Phase 1: move, generalise, re-point, delete the original); move the two translation keys to core's `Common` with the Back Office's current words and delete them from the Back Office JSONs; run `pnpm static:i18n`.
- [ ] Step 4: Run the new tests: PASS; the Back Office bundle (`check-types`, `test`, `test:browser`) at Task 0's counts; `pnpm --filter @allonfire/back-office exec playwright test e2e/sign-in.spec.ts e2e/password-reset.spec.ts e2e/safe-area.spec.ts` (after `pnpm test:services`): green with no spec edited beyond the moved copy keys.

### Task 6: Laura's Polpo dressing, bound once, built through `/aof-design`

The App-side half of Phase 1's slots. Every piece is a Laura file under 40 lines that either dresses a shared piece (`AOFGateFrame`, the notices, the PWA cards, the toaster) or fills a frame slot. The look is the owner's, through `/aof-design craft --app laura` on each target, with one build and one screenshot round (`feedback_design_budget`), the Polpo rules of Phase 2 (Ink, Coral, Floating Frame, Quiet Image) and Tabler icons; this task fixes the contracts and the tests, not the pixels.

**Files:**
- Create: `apps/laura/src/features/auth/components/polpo-gate.tsx`, `features/auth/constants/dressing.tsx`, `shared/constants/action-dressing.tsx`, `shared/components/{polpo-toaster,polpo-mark}.tsx`, `features/errors/components/{polpo-notice-frame,error-notice,not-found-notice}.tsx`, `features/pwa/components/{install-hint-card,offline-card,install-hint,offline-banner,offline-notice}.tsx`, `features/navigation/components/{frame-breadcrumb,section-loading}.tsx`, `features/navigation/constants/section-row.ts`, `features/metadata/utils/image-fonts.ts`
- Test: next to each, `tests/*.browser.test.tsx` (Chromium and WebKit, `renderInApp`) and `tests/*.test.tsx` where Node is enough

**Interfaces:**
- Consumes (fixed by Phase 1): `AOFGateProps`, `AOFAuthDressing`, `AOFActionDressing`, `AOF_ACTION`, `AOFNoticeFrame`, `AOFNoticeFrameProps`, `AOFInstallHintCardProps`, `AOFToastBackdrops`; `AOFErrorNotice`, `AOFNotFoundNotice`, `AOFOfflineNotice`, `AOFInstallHint`, `AOFOfflineBanner`, `AOFFrameBreadcrumb({ app, crumbMark? })`, `AOFToaster({ backdrops })`; (Phase 2) `POLPO_CARD_BACK`, `polpoMarkSvg`, `POLPO_IMAGE_COLOR`, `loadPolpoImageFonts`; (this phase) `AOFGateFrame`, `LAURA`.
- Produces: `PolpoGate: ComponentType<AOFGateProps>`; `AUTH_DRESSING: AOFAuthDressing = { Gate: PolpoGate, actions: ACTION_DRESSING, back: <the way back to Sign in> }`; `ACTION_DRESSING: AOFActionDressing = { className: <cva result>, marks: Record<AOFAction, ReactNode> }` (Tabler marks: back `IconArrowLeft`, enter `IconLogin`, retry `IconRefresh`, save `IconDeviceFloppy`, send `IconSend`); `PolpoNoticeFrame: AOFNoticeFrame` (draws heading, description, `children`, `action` for `kind` error, notFound and offline, each with its own octopus pose from `polpoMarkSvg`); the bindings `ErrorNotice`, `NotFoundNotice`, `OfflineNotice` (`"use client"`, each hands its `Frame` and `actions` to the shared notice); `InstallHintCard`, `OfflineCard` (satisfy `AOFInstallHintCardProps` and `{ description; title }`), `InstallHint`, `OfflineBanner`; `PolpoToaster` (ui's toaster with a backdrop for each of the four kinds); `PolpoMark({ className })` (an `AOFImage` from the SVG as a data URL, painted with the HTML); `sectionRow` (`cva`, variants `current: true | false`); `FrameBreadcrumb` (client binding, `crumbMark` omitted unless the Design draws one); `SectionLoading` (the waiting room: `role="status"` with `Common.Loading.label`, a pulsing mark under `motion-safe:`); `imageFonts()` (`"use cache"`, `cacheLife("max")`, `loadPolpoImageFonts()`).

- [ ] Step 1: Tests (each names what a visitor depends on; no class strings, `getComputedStyle` against the token for a look):
  - `PolpoGate` (browser): children, the `status` text, the language navigation with `aria-current` on the current language and the theme toggle appear; the gate holds no link to a registration page.
  - `AUTH_DRESSING.actions.marks` has a node for every value of `AOF_ACTION` (`objectValues(AOF_ACTION)`).
  - `PolpoNoticeFrame` (browser), for each `AOFNoticeKind`: heading, description and action appear; the kinds draw different marks (the three `img` sources differ).
  - Bindings: `ErrorNotice` shows `Common.Error.title` and a Retry button that calls `retry`; `NotFoundNotice` links to `METADATA.PATH.ROOT`; `OfflineNotice`'s button calls `location.reload` once.
  - `InstallHintCard` (browser): its install button and its dismiss button carry the passed `aria-label`s and handlers; with `steps` it lists them in order; `OfflineCard` shows title and description.
  - `PolpoToaster` (browser): sending each of `success`, `info`, `warning`, `error` through `aofToast` draws that kind's backdrop (four distinct nodes); a notice's title element clamps to five lines (`getComputedStyle(title).webkitLineClamp` is `"5"`), the shape of the Back Office's `station-toaster.browser.test.tsx` (reconcile: re-read it, it arrived with the iOS fix).
  - `InstallHintCard` as a custom toast (browser, phone viewport `SCREEN.VIEWPORT.PHONE`, an iPhone Safari user agent as the Back Office's `install-hint.browser.test.tsx` does): the toast's box is at least as tall as the card inside it, so no step is cut (a line clamp on Sonner's title element, which wraps a custom toast, cut it in WebKit; `AOFToaster` clamps only `data-styled` toasts).
  - `sectionRow` returns different strings for `current: true` and `false` (the one class assertion allowed: it checks the cva exists, not what it says).
  - `SectionLoading`: a status role with the translated label; under `withReducedMotion` the pulse does not animate (`computedValue`, `animation-name` is `none`).
  - `imageFonts()` resolves two faces (400 and 700) named `POLPO_IMAGE_FONT.FAMILY` (mock `next/cache`'s `cacheLife`).
- [ ] Step 2: Run `pnpm --filter @allonfire/laura exec vitest run` and `... exec vitest run --config vitest.browser.config.ts`: FAIL (files missing).
- [ ] Step 3: Implement each piece with `/aof-design craft --app laura --target <file>` (Phase 2's Design read from `packages/design/src/apps/laura/`, `IMPECCABLE_CONTEXT_DIR` as the skill says), starting from the signature above; keep each binding under 25 lines and `"use client"` where a Design function crosses (Review Focus 5). Words beyond core's `Common` go in Laura's `SignIn.*` keys of the catalogues (none required), with `translationsSuite` keeping them in length.
- [ ] Step 4: Run both commands: PASS. Show the owner the gate, a notice, the install card and the toaster in their open tab through `/iso-browser` (announce Chrome's Allow in the same message), one fix pass, no review loops. Then `pnpm static:dupes`: a binding flagged against the Back Office's means the piece belongs in a package; a metadata-style file Next forces is wrapped in `jscpd:ignore` with its reason.

### Task 7: Page information: metadata, share card, icons, favicon, manifest, launch screens, robots

**Files:**
- Create: `apps/laura/src/shared/constants/page-information.ts`, `src/shared/tests/page-information.test.ts`, `src/shared/tests/favicon.test.ts`, `src/app/{manifest,robots}.ts`, `src/app/{icon,apple-icon}.tsx`, `src/app/launch/[screen]/route.tsx`, `src/app/logo/[file]/route.ts`, `src/app/manifest-icon/[icon]/route.ts`, `src/app/[locale]/{opengraph-image,twitter-image}.tsx`, `public/favicon.ico`

**Interfaces:**
- Consumes (fixed by Phase 1, Task 16): `aofAppMetadata({ name, indexing, shareImageAlt, routing, getPathname, translations, startupImage })` returning `{ baseMetadata, pageOpenGraph, pageMetadata, metadataText, layoutMetadata }`; `aofManifest({ name, description, ground })`; `aofAppImages({ logo, line, shareCardLook, ground, fonts, translations })` returning `{ iconImage, shareImage, launchScreen }`; (Phase 2) `POLPO_IMAGE_COLOR`, `POLPO_SHARE_CARD`, `LAURA_LOGO`; (Task 6) `imageFonts`.
- Produces: `page-information.ts` exporting `{ baseMetadata, layoutMetadata, metadataText, pageMetadata, pageOpenGraph }` and `{ iconImage, launchScreen, shareImage }`, the one binding every Laura page imports for its head; `public/favicon.ico` (a PNG-in-ICO of the flat square logo).

- [ ] Step 1: Tests. `page-information.test.ts`: `pageOpenGraph("/favorites", "it").url` is `getPathname({ href: "/favorites", locale: "it" })` (`/it/favorites`); `pageOpenGraph("", "en").url` uses `METADATA.PATH.ROOT`; `layoutMetadata({ locale: "en", origin: LOCAL.URL.LAURA }).title` has `default: LAURA.name` and `template: pageTitle("%s", LAURA.name)`; its `description` is `EN.Metadata.description`; `metadataText("xx")("description")` falls back to the default language (a placeholder locale). `favicon.test.ts`: `public/favicon.ico` begins with the ICO signature (`00 00 01 00`), declares one image, and its payload begins with the PNG signature. The route files are read by Next from the file itself; their behaviour is pinned by the head suite in Task 11 (title, `og:image`, icons, manifest `display: "standalone"` with `name: LAURA.name`, a share image of `METADATA.SHARE_IMAGE.SIZE` under 300 KB, launch screens, robots `Allow: /` without a sitemap).
- [ ] Step 2: Run `pnpm --filter @allonfire/laura exec vitest run src/shared/tests`: FAIL.
- [ ] Step 3: Implement as the Back Office's bindings with Polpo values: `ground: POLPO_IMAGE_COLOR`, `shareCardLook: POLPO_SHARE_CARD`, `line: LAURA.line`, `fonts: imageFonts`, `startupImage: AOFLaunchScreenLinks()`. `manifest.ts` is `aofManifest({ name: LAURA.name, description: metadataText(I18N.DEFAULT_LANGUAGE)("description"), ground: POLPO_IMAGE_COLOR.light.background })`; `robots.ts` is `AOFRobots({ indexing: ACCESS.APP_SETTINGS[App.LAURA].indexing, origin: env.LAURA_URL })`; `icon.tsx` the `aofLogoSvg` response of `LAURA.logo`; `launch/[screen]/route.tsx` and `logo/[file]/route.ts` as the Back Office's over `LAURA.logo` and Polpo's ground; the two image files hold the same export lines as the Back Office's pair (Next reads them from the file): wrap the pair's shared lines in `jscpd:ignore-start` with the Back Office's own reason if `pnpm static:dupes` flags them. The favicon: render `aofLogoSvg` (square, `auto`) to a 48 px PNG with the repo's Playwright Chromium from a scratchpad script, wrap it as a one-image ICO (6-byte header, 16-byte directory entry, the PNG), write `public/favicon.ico`; the script stays out of the repo. No JSON-LD, no sitemap (decisions above).
- [ ] Step 4: Run the Step 2 command: PASS. Render the share card, the Apple icon and one launch screen once (`pnpm --filter @allonfire/laura build` then request each route, or the e2e in Task 11) and show them to the owner with Task 6's round: Satori could not run in Phase 2 (its Contract, item 8), so this is the first real render of `POLPO_SHARE_CARD` and the image font; if Satori rejects a `.woff`, convert it as P2 Task 3's reconcile note says.

### Task 8: Locale document, proxy, special pages, Offline page and PWA

**Files:**
- Create: `apps/laura/src/app/[locale]/layout.tsx`, `src/app/global-error.tsx`, `src/app/[locale]/{error,not-found}.tsx`, `src/app/[locale]/[...rest]/page.tsx`, `src/app/[locale]/offline/page.tsx`, `src/app/[locale]/(signed-in)/not-found.tsx`, `src/proxy.ts`, `src/proxy.test.ts`

**Interfaces:**
- Consumes: `AOFLocaleDocument({ locale, children, toaster, hint, banner, pwaEnabled })` (Phase 1, Task 17), `proxyMatcherSuite({ config, pages })`, `withSessionRefresh`, `withSignInGate(proxy, { locales, pages, gated })` (Phase 1, Task 8), `AOFBaseViewport`, `sectionPaths`, `gatedSections` (Task 4), `PolpoToaster`, `InstallHint`, `OfflineBanner`, `ErrorNotice`, `NotFoundNotice`, `OfflineNotice` (Task 6), `layoutMetadata`, `pageMetadata` (Task 7).
- Produces: the proxy `default` and `config.matcher` (the same literal as the Back Office's, which Next reads statically), the layout's `generateStaticParams`, `generateMetadata`, `viewport`, and the pages above.

- [ ] Step 1: Tests. `proxy.test.ts` is `proxyMatcherSuite({ config, pages: sectionPaths(LAURA) })` plus one case of its own: the matcher routes `/memory/leaderboard` and `/upload` as pages and skips `/launch/x.png`. Add `src/app/tests/layout.test.tsx`: `viewport` carries both `POLPO_IMAGE_COLOR` ground colours; `generateStaticParams()` equals `routing.locales.map((locale) => ({ locale }))`. The Offline, error, not-found and global-error pages are pinned by Task 11's `pwa` and `head` suites (the Offline page in the URL's language, the 404 styled and titled for a path no language owns) and by Task 6's binding tests.
- [ ] Step 2: Run `pnpm --filter @allonfire/laura exec vitest run src/proxy.test.ts src/app`: FAIL.
- [ ] Step 3: Implement as the Back Office's files over the Laura bindings. The layout renders `<AOFLocaleDocument locale={await getLocale()} toaster={<PolpoToaster />} hint={<InstallHint />} banner={<OfflineBanner />} pwaEnabled={env.NODE_ENV === ENV.NODE.PRODUCTION}>`. `proxy.ts`: `withSessionRefresh(withSignInGate(AOFCreateMiddleware(routing), { locales: routing.locales, pages: sectionPaths(LAURA), gated: gatedSections(LAURA) }))`. `global-error.tsx` wraps `ErrorNotice` in `AOFThemeProvider` with the shared default-language translator, as the Back Office's. No `loading.tsx` under `[locale]` (it turns every 404 into a 200). The Offline page title is `pageMetadata(PWA.PATH.OFFLINE, "Common.Offline.title")`.
- [ ] Step 4: Run the Step 2 command: PASS; `pnpm --filter @allonfire/laura exec vitest run --config vitest.browser.config.ts`: green.

### Task 9: The four auth pages, thin bindings, no registration

**Files:**
- Create: `apps/laura/src/app/[locale]/{sign-in,forgot-password,reset-password,email-verified}/page.tsx`, tests `src/app/tests/auth-pages.test.tsx`

**Interfaces:**
- Consumes: `AOFSignIn({ appName, appUrl?, dressing })`, `AOFForgotPassword`, `AOFResetPassword`, `AOFEmailVerified` (Phase 1, Task 15), `AUTH_DRESSING` (Task 6), `pageMetadata`, `env.LAURA_URL`, `LAURA.name`.
- Produces: the four routes at `AUTH.PAGE.SIGN_IN`, `FORGOT_PASSWORD`, `RESET_PASSWORD`, `EMAIL_VERIFIED`, each `generateMetadata = () => pageMetadata(AUTH.PAGE.X, "Common.Auth.<Page>.title")` (reconcile: the exact shared keys are Phase 1's, Task 15).

- [ ] Step 1: Test (`renderToStaticMarkup` over each page's default export with `renderInUi`, the Laura gate): each page contains the shared copy's heading read through `createTranslator` from core's `Common`; the Sign in page contains no link whose `href` is a registration page (`ACCESS.APP_SETTINGS[App.LAURA].registration` is `null`, read in the test, so a future change flips it); the forgot-password form posts `resetPage` as `${LAURA_URL}/${locale}${AUTH.PAGE.RESET_PASSWORD}`; Italian renders Italian.
- [ ] Step 2: Run `pnpm --filter @allonfire/laura exec vitest run src/app/tests/auth-pages.test.tsx`: FAIL.
- [ ] Step 3: Implement: `<AOFSignIn appName={LAURA.name} appUrl={env.LAURA_URL} dressing={AUTH_DRESSING} />`, the same shape for the others; "Someone already signed in never gets here: the proxy sends them Home" stays as the one comment, as in the Back Office.
- [ ] Step 4: Run it: PASS. The sign-in flow itself (a User and an Admin enter, a Back Office-only Admin is refused, Forgot and Reset password) is Task 11's e2e.

### Task 10: The signed-in frame, the four Sections' pages and the Upload gate

**Files:**
- Create: `apps/laura/src/app/[locale]/(signed-in)/layout.tsx`, `(signed-in)/{page,favorites/page,memory/page,memory/leaderboard/page,upload/page}.tsx`, `src/features/navigation/utils/signed-in-page.tsx`, `src/features/navigation/tests/sections.test.ts`, `src/app/tests/upload-gate.test.ts`
- Modify: `packages/design/src/apps/laura/DESIGN.md`/`DESIGN.json` through `/aof-design document` and `pnpm design:sync --from laura` (Phase 2, Contract item 9)

**Interfaces:**
- Consumes: `AOFAppFrame` (Phase 1, Task 12; `variant`, `collapsible`, `slots`, `classNames`, `rowClassName`), `AOFAccount`, `AOFAccountPlaceholder`, `AOFAppSwitcher`, `AOFCurrentApp`, `AOFSignOutForm` (Task 10 of Phase 1), `AOFSectionPage`, `withAppSession(Page, fallback, { minRole })` (Phase 1, Task 8), `sectionGuards` (Phase 1, Task 7), `sectionRow`, `FrameBreadcrumb`, `SectionLoading`, `LAURA`, `env.BACK_OFFICE_URL`.
- Produces: `signedInPage(Page, options?: { minRole?: Role })` (`withAppSession(Page, <SectionLoading />, options)`); the layout; five placeholder pages.

The layout (a Server Component, static, as the Back Office's):

```tsx
<AOFSignOutForm />
<AOFAppFrame app={LAURA} variant="floating" collapsible="icon"
  account={<Suspense fallback={<AOFAccountPlaceholder />}><AOFAccount app={LAURA} /></Suspense>}
  switcher={<Suspense fallback={<AOFCurrentApp app={LAURA} />}><AOFAppSwitcher app={LAURA} addresses={{ [App.BACK_OFFICE]: env.BACK_OFFICE_URL }} /></Suspense>}
  breadcrumb={<FrameBreadcrumb />} rowClassName={{ current: sectionRow({ current: true }), idle: sectionRow({ current: false }) }}>
  {children}
</AOFAppFrame>
```
The account has no `seal`: Laura draws no Role stamp (the Role reads as a word from `Common.Navigation.role`). The Upload row is drawn by the frame's `AOFRoleGatedSection` (Phase 1), so a User never sees it and the rest of the frame stays in the static shell. A placeholder page:

```tsx
export const generateMetadata = () => pageMetadata(SECTION.FAVORITES.path, `Navigation.${SECTION.FAVORITES.label}`);
const FavoritesPage = () => { const t = useTranslations("Navigation"); return <AOFSectionPage><h1 className="sr-only">{t(SECTION.FAVORITES.label)}</h1></AOFSectionPage>; };
export default signedInPage(FavoritesPage);
```
Home (the Gallery) uses `pageMetadata(AUTH.PAGE.HOME)` (the layout's default title); Upload ends `export default signedInPage(UploadPage, { minRole: Role.ADMIN });`.

- [ ] Step 1: Tests.
  - `sections.test.ts` is `sectionGuards({ app: LAURA, signedInDir: <the (signed-in) folder> })`: every page is under a Section, every Section has its page, every page ends `export default signedInPage(`, and Upload's page source contains `minRole: Role.ADMIN` equal to its Section's.
  - `upload-gate.test.ts`: `gatedSections(LAURA)` equals `[{ path: PAGE.UPLOAD, minRole: Role.ADMIN }]` (the proxy gets exactly this list); with `withAppSession` mocked to record its third argument, importing the Upload page's default export records `{ minRole: Role.ADMIN }` and every other page records none or `undefined`; `sectionAllowed(SECTION.UPLOAD, Role.USER, <floor>)` is `false` and `Role.ADMIN` is `true` (Phase 1, Task 7).
  - The layout's contract is pinned in ui (Phase 1, Task 12): here only that `LAURA` is passed with `variant="floating"` and `collapsible="icon"` (a `renderToStaticMarkup` of the layout with the frame's children mocked reads `data-frame-variant="floating"`).
- [ ] Step 2: Run `pnpm --filter @allonfire/laura exec vitest run src/features/navigation src/app`: FAIL.
- [ ] Step 3: Implement. Then `pnpm --filter @allonfire/laura check-types` (now covers `app/`, `next.config.ts` and the e2e folder once Task 11 lands): green. Wear the Design once: run `/aof-design document` in scan mode for Laura (`IMPECCABLE_CONTEXT_DIR=packages/design/src/apps/laura`, target `apps/laura/src/app`), move `packages/design/.impeccable/design.json` to `packages/design/src/apps/laura/DESIGN.json` if written, `pnpm design:sync --from laura`, then the skill's cleanup (delete `apps/laura/.impeccable/`, `PRODUCT.md`, `DESIGN.md`, root `.impeccable/`). Reconcile: P2's Task 10 `apps.test.ts` might assert `DESIGN.json` absent; flip that assertion in this step.
- [ ] Step 4: Run the Step 2 command: PASS; `pnpm design:sync --check` and `pnpm --filter @allonfire/design test`: green; `pnpm --filter @allonfire/laura test` and `test:browser`: all Laura tests so far pass, including Task 1's structure assertion.

### Task 11: The shared e2e kit, the Back Office on it, and Laura's e2e

Review Focus 1 and 3 and 5. `apps/back-office/e2e/{pages.ts,safe-area.spec.ts,sign-in.spec.ts,frame.spec.ts,head.spec.ts}` are almost entirely App-agnostic; a Laura copy would be a clone. They move into suites that take the App as an argument.

**Files:**
- Create (ui, `packages/ui/src/features/app/tests/e2e/`): `app-pages.ts`, `sign-in-suite.ts`, `frame-suite.ts`, `safe-area-suite.ts`, `head-suite.ts`; (Laura) `e2e/{pages.ts,safe-area.spec.ts,sign-in.spec.ts,frame.spec.ts,head.spec.ts,pwa.spec.ts,upload-gate.spec.ts,floating-frame.spec.ts}`
- Modify: `packages/ui/package.json` (export keys `./features/app/tests/e2e/<name>`; devDependency `@playwright/test` at the range the repo already uses, which adds no package), `knip.jsonc` (the five kit files in `ignoreIssues`, same reason as Task 2), `packages/config/tests/e2e/safe-area.ts` (the `appRoutes` helper and constants stay; the suite imports them), Back Office `e2e/pages.ts`, `safe-area.spec.ts`, `sign-in.spec.ts`, `frame.spec.ts`, `head.spec.ts`, `pwa.spec.ts` (each becomes its suite call plus its own cases)

**Interfaces:**
- Produces `aofAppPages({ app: AppDescriptor })` returning `{ SIGN_IN_URL, onPhone, openSidebar, openAccountMenu, tapSidebarLink, signIn(page, { email }, { locale?, password? }), signInAndWait(page, user) }` (the Back Office's `pages.ts` helpers, copy read from `SHARED_TRANSLATIONS` and `Common.Navigation`); `signInSuite({ app, baseUrl, allowed, refused, italianRefused })`; `frameSuite({ app, admin, languageProbe: { path, query } })` (moves between Sections and sub-pages, language switch keeps Section and query, header names the App, sign out, signed-out visit answers 307 for each Section, the menu folded before the page runs); `safeAreaSuite({ appDir, address, signedIn: (page) => Promise<void>, firstSection })` (the Back Office's body, `SCREEN` and `appRoutes` inside); `headSuite({ app, baseUrl, ground, indexing })` (complete head, Italian head, robots, 404 for paths no language owns, icons, favicon, manifest, share images within 300 KB). Each registers Playwright `test`s when called from a spec file.

- [ ] Step 1: Baseline the Back Office e2e before moving anything: `pnpm test:services`, then `pnpm --filter @allonfire/back-office exec playwright test e2e/safe-area.spec.ts e2e/sign-in.spec.ts e2e/frame.spec.ts e2e/head.spec.ts e2e/pwa.spec.ts`; note the counts per project (chromium, webkit, mobile-chrome, mobile-safari).
- [ ] Step 2: Move: write each suite from the Back Office spec body, replacing the App's literals with `app` (`app.name`, `app.sections`, `app.sections[0].path`), and reduce the Back Office specs to their suite call plus their own cases (its Users query probe, its Images sub-menu, its Japan 404 ground `rgb(246, 247, 248)` as `ground`). Re-run Step 1's command: the same pass counts, no assertion lost.
- [ ] Step 3: Laura's specs. `e2e/pages.ts`: `export const { onPhone, openAccountMenu, openSidebar, signIn, SIGN_IN_URL } = aofAppPages({ app: LAURA })`, plus `signInAsUser(page)` and `signInAsAdmin(page)` (as `FIXTURE.USER.LAURA.USER` and `.ADMIN`, waiting for the frame). `sign-in.spec.ts`: `signInSuite({ app: LAURA, baseUrl: LOCAL.URL.LAURA_E2E, allowed: [FIXTURE.USER.LAURA.USER, FIXTURE.USER.LAURA.ADMIN], refused: [FIXTURE.USER.BACK_OFFICE.ADMIN, FIXTURE.USER.NO_MEMBERSHIP], italianRefused: FIXTURE.USER.NO_MEMBERSHIP })`: a Back Office-only Admin and a User with no Membership are refused with `Common.Auth.SignIn.error.forbidden`. `frame.spec.ts`: `frameSuite({ app: LAURA, admin: FIXTURE.USER.LAURA.ADMIN, languageProbe: { path: PAGE.FAVORITES, query: "" } })` (Memory's sub-menu is walked by the suite: Play marked on `/memory`, Leaderboard on `/memory/leaderboard`). `safe-area.spec.ts`: `safeAreaSuite({ appDir: <src/app>, address: { "/[...rest]": () => "/no-such-page" }, signedIn: signInAsAdmin, firstSection: SECTIONS[0].path })` (every page is found from `src/app`; Laura has no param page yet). `head.spec.ts`: `headSuite({ app: LAURA, baseUrl: LOCAL.URL.LAURA_E2E, ground: <Polpo's light --background as rgb()>, indexing: UNINDEXED })`. `pwa.spec.ts`: the Back Office's cases that need the App's own sign-in copy (the service worker served uncached; the Offline page in the URL's language; retry once back online; a lost connection reported mid-session) as a `pwaSuite` in the kit, if Phase 1 left it App-specific (reconcile: `git grep -n "WORKER_OFFLINE" apps`), else call Phase 1's.
  `upload-gate.spec.ts` (Review Focus 3):

```ts
test("a signed-out visit to Upload is sent to Sign in before any page", ...)            // request.get(`/it${PAGE.UPLOAD}`, { maxRedirects: 0 }) is 307 to Sign in
test("a User is sent Home from Upload and never sees its row", async ({ page }) => {
  await signInAsUser(page);
  const res = await page.request.get(PAGE.UPLOAD, { maxRedirects: 0 });
  expect(res.status()).toBe(HTTP.STATUS.TEMPORARY_REDIRECT);                            // the proxy
  await page.goto(PAGE.UPLOAD);
  await expect(page).toHaveURL(HOME_URL);                                              // and the browser lands Home
  await openSidebar(page);
  await expect(menuOf(page).getByRole("link", { name: enT("Navigation.upload") })).toHaveCount(0); // the frame
});
test("an Admin reaches Upload and sees its row", ...)                                   // heading enT("Navigation.upload"), row present, aria-current on it
```
  `floating-frame.spec.ts` (chromium only, `E2E.TAG.CHROMIUM_ONLY`): on a desktop Admin visit the frame carries `data-frame-variant="floating"`; the sidebar container's computed `border-radius` equals the resolved `--frame-radius` of `:root` and its `box-shadow` equals `--frame-shadow`; the gap between the viewport edge and the sidebar equals `--frame-gap` plus the safe-area inset (0 on desktop); the dark scheme (emulated media) reads the dark `--frame-shadow`.
- [ ] Step 4: Run, after `pnpm test:services`: `pnpm --filter @allonfire/laura exec playwright test` (all Laura specs, four projects; the safe-area and floating specs run in Chromium only). Expected before Tasks 6 to 10 are done: FAIL; after: PASS. Then Back Office's five specs again: PASS at Step 1's counts. Then `pnpm static:dupes`, `pnpm static:knip`.

### Task 12: Hosting and tooling wiring

**Files:**
- Modify: `package.json` (`lint-staged` second line `pnpm --filter @allonfire/laura tailwind:canonicalize`; `static:fix` runs `pnpm --workspace-concurrency=1 --filter @allonfire/back-office --filter @allonfire/laura tailwind:fix`; delete `docker:build:laura`, which cannot build without the build args and has no Back Office twin), `knip.jsonc` (a `"apps/laura"` workspace entry equal to the Back Office's; reword the stale "Held only by Laura" reasons: `playwright.config.ts` becomes "Read by the Apps' playwright.config.ts, which production mode leaves out" and the export of `playwrightConfig` is dropped; the other two entries, `format-error-message.ts` and `game-score.service.ts`, stay until Phase 6 and Phase 7 and say so), `.jscpd.json` (`apps/laura` in `path`), `biome.jsonc` (drop `!apps/laura` from `files.includes` and the `apps/laura/**` linter-off override; keep the `@allonfire/laura` restricted-import entries), `.oxlintrc.json` (drop `apps/laura/**`), `packages/core/src/features/ci/affected.ts` (reword the comment "leaves paused Laura out"), `packages/config/README.md` (line 170: `*.css` is declared by Next's own types), `packages/config/local/tests/{root-scripts,package-exports}.test.ts` (drop the `apps/laura/` filter and the "held only by Laura" comment where it no longer holds), `turbo.json` (done in Task 3), `.github/workflows/ci.yml` (`build` job env gains `LAURA_URL: ${{ secrets.LAURA_URL }}`), `.github/workflows/deploy.yml` (build-args gain `LAURA_URL=${{ secrets.LAURA_URL }}`), `docker/Dockerfile` (`ARG LAURA_URL` and its `ENV`, comment extended: both Apps' addresses, build and runtime match), `docker/docker-compose.prod.yml` (the `back-office` service gets `- LAURA_URL=${LAURA_URL:?LAURA_URL is required}`; the comment "Laura is out of Production until its rebuild" says Laura's service arrives with the cutover), `docker/.env.example` (`# LAURA_URL=`, in its alphabetical place), `packages/config/local/tests/{local-files,prod-compose,workflows}.test.ts`, `.gitignore` (`apps/laura/env/.env.production` is covered by `.env.production`; nothing to add)

**Interfaces:** Produces the repo's treatment of Laura as a workspace App: Turbo runs its `build`, `check-types`, `test`, `test:browser`, `test:e2e`, `i18n:check`, `tailwind:check`; CI builds it; the Docker prune and build work for `APP_NAME=laura`.

- [ ] Step 1: Tests. `local-files.test.ts`: the `deploy.yml` build-args contain `LAURA_URL`; the Dockerfile's builder stage declares `ARG LAURA_URL`; `ci.yml` holds `LAURA_URL: \${{ secrets.LAURA_URL }}`; the root `package.json` `lint-staged` holds the Laura canonicalize line and `static:fix` names both Apps. `prod-compose.test.ts`: the `back-office` block contains `- LAURA_URL=${required("LAURA_URL")}` and the existing "every required key has a `.env.example` line" case passes (`docker/.env.example` carries it). `knip-config.test.ts`: passes unchanged (no folder globs; reasons still not "tests only"). `workflows.test.ts`: passes.
- [ ] Step 2: Run `pnpm --filter @allonfire/config test`: FAIL.
- [ ] Step 3: Implement the edits. Owner actions, stated in the task's notes and in `README.md`'s deploy setup (Task 14): add GitHub secret `LAURA_URL` to environments `prod` and `dev` (each its own value, the same name), and `LAURA_URL` to `docker/.env.production` and Dokploy's env before the next deploy, via `pnpm env:prod` (`gh-secret`, `copy`): the Back Office's compose now refuses to start without it (`:?`), which is the intended fail-safe.
- [ ] Step 4: Run `pnpm --filter @allonfire/config test`, `pnpm static:workflows` (Docker), `pnpm static:knip`, `pnpm static:knip-production`, `pnpm static:dupes`, `pnpm static:lint`, `pnpm static:tailwind`: PASS. Then the build proofs: `pnpm turbo prune @allonfire/laura --docker` succeeds in a temporary copy (the lockfile resolves for Laura), and, with Docker running, `docker build -f docker/Dockerfile --build-arg APP_NAME=laura --build-arg NEXT_PUBLIC_API_URL=http://localhost:3300 --build-arg BACK_OFFICE_URL=http://localhost:3400 --build-arg LAURA_URL=http://localhost:3200 -t allonfire-laura-check .` exits 0 (report if the machine cannot run it).

### Task 13: The parity audit

**Files:**
- Create: `docs/superpowers/specs/2026-11-17-laura-parity-audit.md`, `packages/config/local/tests/laura-parity-audit.test.ts`

**Interfaces:** Produces the table Phase 7 verifies. Row format: `| old path, glob or library | fate | replaced by (a named package piece or Phase N file) or the reason |`, fate one of `replaced`, `kept`, `deleted`; a `kept` path still exists (a rewritten file is `kept (rewritten: what changed)`), a `replaced` or `deleted` path matches no file in `git ls-files apps/laura`, a library row `kept` is in Laura's `package.json` and the others are not.

- [ ] Step 1: Write the test first. It reads the audit, parses every row, and asserts: no row's fate is `pending` (or anything but the three words); every path row obeys the rule above (`globSync` over `apps/laura`, skipping `._*`); every library row obeys it against `apps/laura/package.json`; every file that `git ls-files apps/laura` lists today is covered by a row (a file with no row fails by name); and each `replaced by` cell is non-empty. Turbo's input list for config excludes Markdown on purpose, so a Markdown-only change does not re-run this test from cache: run it directly (the checkpoint does).
- [ ] Step 2: Run `pnpm --filter @allonfire/config exec vitest run local/tests/laura-parity-audit.test.ts`: FAIL (no audit file).
- [ ] Step 3: Write the audit. Read the old list (`<scratchpad>/old-laura-files.txt`, Task 0) and give every file a row, grouping a folder in one glob row where all its files share a fate. Spec: `lib/seo.ts`, `json-ld.tsx`, `apple-splash-links.tsx`, `user-role-provider`, `check-access`, `file-validation`, `blur-placeholder`, `animation-variants` each get their own row. The table, as decided here:

| Old (path, glob or library) | Fate | Replaced by, or why |
|---|---|---|
| `apps/laura/package.json`, `tsconfig.json`, `postcss.config.mjs`, `README.md`, `next.config.ts`, `playwright.config.ts` | kept (rewritten) | the Back Office's shapes over the shared pieces (Tasks 1, 3, 14); the old `--webpack`, `analyze`, `dev:tailscale`, `seed-photos`, body-size, rewrites and `images.remotePatterns` settings are gone |
| `apps/laura/.env.example` | kept (rewritten) | new owner-prefixed names (`AUTH_APP`, `API_*`, `LAURA_URL`, `BACK_OFFICE_URL`, `TELEMETRY_*`); `BETTER_AUTH_*`, `DATABASE_URL`, `LAURA_VIEWER_*` and `MINIO_*` dropped |
| `apps/laura/e2e/login.spec.ts` | replaced | `e2e/sign-in.spec.ts` over `signInSuite` (Task 11) |
| `apps/laura/messages/*.json` | replaced | `src/features/i18n/translations/{en,it}.json` (Task 4); old keys not carried |
| `apps/laura/public/allonfire-laura*.svg`, `laura-logo.png` | replaced | `LAURA_LOGO` through `aofLogoSvg`, the `logo/[file]` and `icon` routes |
| `apps/laura/public/{apple-icon-180x180,favicon-16x16,favicon-32x32,icon-192x192,icon-512x512}.png` | replaced | `apple-icon.tsx`, `manifest-icon/[icon]` over core's `AOFIconImage` |
| `apps/laura/public/favicon.ico` | kept (regenerated) | the flat square logo as ICO (Task 7) |
| `apps/laura/public/memory-card-back-{dark,light}.png` | replaced | `POLPO_CARD_BACK` (Phase 2), used by Phase 6 |
| `apps/laura/public/splash/*` | replaced | `launch/[screen]` over `AOFLaunchScreenRoute` |
| `apps/laura/scripts/*` | deleted | Images come from the Image module (Upload, Phase 5, and the Back Office); both scripts imported services that no longer exist |
| `src/env.ts` | replaced | `src/environment/environment.ts` (Task 3) |
| `src/proxy.ts`, `src/i18n/*` | replaced | `src/proxy.ts` over `withSignInGate`; `features/i18n/*` over core's `aofBaseRouting` (Tasks 4, 8) |
| `src/types/css.d.ts` | deleted | Next's own types declare `*.css` (Task 12 fixes the README line that named it) |
| `src/lib/auth.ts`, `src/app/api/auth/[...all]/route.ts` | deleted | the API's Auth module is the only auth (ADR 0009, spec decision 2); sign-in actions come from `@allonfire/auth` |
| `src/lib/seo.ts` | replaced | `aofAppMetadata` (`page-information.ts`, Task 7) |
| `src/components/json-ld.tsx` | deleted | Laura is unindexed, structured data has no reader (spec decision 7) |
| `src/components/apple-splash-links.tsx` | replaced | `AOFLaunchScreenLinks()` through `aofAppMetadata({ startupImage })` |
| `src/app/{sitemap,robots}.ts` | `sitemap.ts` deleted, `robots.ts` replaced | unindexed; `AOFRobots` |
| `src/app/{icon.svg,opengraph-image.tsx}`, `src/app/[locale]/{manifest,opengraph-image,twitter-image}.tsx` | replaced | `icon.tsx`, the shared share card (`aofAppImages`), `manifest.ts` over `aofManifest` |
| `src/app/[locale]/{error,global-error,not-found}.tsx`, `src/app/not-found.tsx` | replaced | `AOFErrorNotice`/`AOFNotFoundNotice` bindings; `global-error.tsx`; the localized 404 (`AOFWithLocalizedNotFound`) |
| `src/app/[locale]/{forbidden,unauthorized}.tsx` | deleted | no `authInterrupts`: a Role too low is sent Home by the proxy and the page, refused 403 by the API |
| `src/app/[locale]/layout.tsx` | replaced | `AOFLocaleDocument` binding (Task 8) |
| `src/app/[locale]/(auth)/login/page.tsx` | replaced | `sign-in` and the three password pages (Task 9); the viewer quick-login is gone with Viewer |
| `src/app/[locale]/(dashboard)/layout.tsx` | replaced | `(signed-in)/layout.tsx` over `AOFAppFrame` (Task 10) |
| `src/app/[locale]/(dashboard)/**/loading.tsx` | deleted | no `loading.tsx` under `[locale]`; each page ships its skeleton (Phases 4 to 6) |
| `(dashboard)/page.tsx`, `favorites/page.tsx` | replaced | Phase 4: Gallery and Favorites pages (placeholders in Task 10) |
| `(dashboard)/upload/page.tsx` | replaced | Phase 5: Upload page, Admin only (placeholder in Task 10) |
| `(dashboard)/games/page.tsx` | deleted | Memory is the only game; its page is `/memory` (Phase 6) |
| `(dashboard)/games/memory/**` | replaced | Phase 6: `/memory` and `/memory/leaderboard` |
| `(dashboard)/games/quiz/**`, `features/games/**/quiz-*`, `features/games/hooks/use-quiz-game.ts`, `features/games/actions/quiz*.ts` | deleted | Quiz is removed completely (spec) |
| `(dashboard)/settings/**`, `features/settings/**` | deleted | language, theme and sign out live in the account menu (`AOFAccountMenu`, spec decision 6) |
| `src/actions/check-access.ts` | deleted | `requireApp(App.LAURA[, Role.ADMIN])` in the API; `signedInPage({ minRole })` and the proxy `gated` list in the App |
| `src/components/{animated-page,motion-provider}.tsx`, `src/lib/animation-variants.ts` | deleted | `framer-motion` is dropped; motion is CSS behind `motion-safe:` where the Design needs it |
| `src/components/user-role-provider.tsx` | deleted | the Role is read on the server from the Session (`AOFRoleGatedSection`, the account menu); no client Role context, and Viewer is gone |
| `src/lib/blur-placeholder.ts` | replaced | the API's `blurDataUrl` with `AOFStorageImage placeholder="blur"` (Phase 4) |
| `src/lib/convert-heic.ts` | replaced | `heicToJpeg` and `isHeic` in `@allonfire/ui/shared/utils/heic-to-jpeg` (`heic-to`; Phase 5) |
| `src/lib/file-validation.ts` | replaced | the Image module's `IMAGE.LIMIT.*` and ui's file field (Phase 5) |
| `src/features/gallery/**` | replaced | Phase 4 `features/gallery` (private-cache hydration, `useInfiniteQuery`, `optimisticMutation` favorite, `AOFStorageImage`); `use-heart-animation.ts` and its heart deleted (a Favorite is a static mark for a User) |
| `src/features/games/**` (not quiz) | replaced | Phase 6 `features/memory`; `game-hub.tsx` deleted; `format-time.ts` replaced by the Phase 6 timer helper |
| `src/features/layout/**` | replaced | `AOFAppFrame`, `AOFSidebarSectionLink`, `AOFFrameBreadcrumb`; `use-auto-hide-navbar.ts` deleted (a sidebar frame has no navbar) |
| `src/features/upload/**` | replaced | Phase 5 `features/upload` (shared dropzone and preview grid, all-or-nothing `POST /images`) |
| `src/features/*/{CLAUDE,README}.md` | deleted | the old feature docs describe deleted code; later phases write their own |
| `framer-motion` | deleted | see motion above |
| `lucide-react` | replaced | `@tabler/icons-react` |
| `react-hook-form` | replaced | `useAOFForm` (`@allonfire/ui/features/form/utils/form`) |
| `sonner` | replaced | `AOFToaster` and `useAOFToast` (ui); sonner stays inside ui |
| `heic2any` | replaced | `heic-to` through ui's `heic-to-jpeg` |
| `@t3-oss/env-nextjs` | kept | `createEnv`, as the Back Office |
| `@better-auth/prisma-adapter`, `better-auth` | deleted | auth runs in the API |
| `@allonfire/database` | kept | enums, `ACCESS` and fixtures only; no Prisma client or service import (Task 1's guard) |
| `@allonfire/storage` | deleted | not imported by the shell; Phases 4 and 5 list it with their first import |
| `@next/bundle-analyzer`, `sharp`, `tsx` | deleted | the Back Office has none; the scripts that needed `sharp` and `tsx` are gone |
| `next-themes`, `@tanstack/react-query` | kept | the Back Office's range; `@tanstack/react-query` is read first in Phase 4 |

  Note for the executor: some rows above merge several old files; the test names any file with no row, so expand a glob (or add a row) until it passes. A fate for a file that a later phase replaces is `replaced` with the phase's named file, never `pending`.
- [ ] Step 4: Run the Step 2 command: PASS; run it again at the checkpoint (Task 15), after the last deletion.

### Task 14: Docs and READMEs

**Files:**
- Modify: `docs/guides/laura.md` (rewritten), `apps/laura/README.md` (rewritten through `/aof-documentation`; screenshots come in Phase 7, none yet), `README.md` (the Apps block: Laura's description and badges without Framer Motion and Prisma; the layout block lists `apps/api`, `apps/back-office`, `apps/laura`; the deploy one-time setup lists secret `LAURA_URL`; the Local section's step 7 and 8 name Laura's `.env.development.local` too; "Laura is out of Production until its rebuild" becomes "until the cutover phase"), `AGENTS.md` (line 15: `apps/laura` (Next 16, 3200)), `docs/guides/next-apps.md` ("Back Office now, Laura once rebuilt" twice become "the Back Office and Laura"; the Environment pointer names Laura's address too; the checklist's `signedInPage` line gains `{ minRole }` if Phase 1 left it), `docs/guides/package-layout.md` ("Laura keeps its old names until it is rebuilt" deleted), `docs/guides/forms.md` ("Laura keeps `react-hook-form` until it is rebuilt" deleted), `docs/guides/tooling.md` ("laura still turns its dev cache off" deleted; the knip "Laura-only export" example reworded to the two entries that stay), `docs/guides/code-style.md` (oxlint "ignores Laura" deleted; the Framer Motion example and the memory-page example, both deleted files, point at the Back Office or are dropped), `docs/guides/design-system.md` ("Laura joins once rebuilt (its stylesheet still imports a theme that no longer exists)" becomes "Laura wears Polpo"; the new-App line names `lint-staged`, `static:fix` and the three scripts), `docs/guides/deployment.md` ("Back Office build needs `BACK_OFFICE_URL`" becomes "every Next App's build needs `BACK_OFFICE_URL` and `LAURA_URL`"; the Hosts line keeps `laura.` for the cutover), `docs/guides/vps.md` (line 32 unchanged until Phase 7: leave it), `docs/guides/testing.md` ("Every App has an `e2e/safe-area.spec.ts`" names `safeAreaSuite`; the presets, `environmentSuite`, `translationsSuite` and the e2e kit), `packages/ui/README.md` or the package-layout shared-scaffold map if Phase 1 created one (`AOFGateFrame`, `AOFLanguageSwitch`), `packages/config/README.md` (the Vitest presets), `CONTEXT.md` (nothing: Gallery, Favorite, Memory game and App scaffolding are written; add no term), `.claude/skills/aof-documentation/**` (its Laura screenshot list and `:3200` inventory describe deleted pages: left to Phase 7, which has the screenshots; the plan records it in the checkpoint notes)

**Interfaces:** none produced. `docs/guides/laura.md` after this task holds, in `writing.md`'s style (short, pointers, no code copies): what Laura is; its Sections and routes (`/` Gallery, `/favorites`, `/memory`, `/memory/leaderboard`, `/upload` Admin only); the frame (`variant="floating"`, `collapsible="icon"`, ADR 0033) and Polpo; the Roles (User browses and plays, Admin also adds; the Upload gate in four places: proxy, page, frame row, API); auth (no registration, an Admin adds Users in the Back Office; one Session across Apps on the parent domain, and on `localhost` Locally); env names and ports (3200 Local, 3210 e2e, 3220 preview); where each shared piece lives (pointers to `next-apps.md`, `package-layout.md`); the placeholder pages and what each later phase replaces; the Local tips that still hold (the `randomUUID` fallback note and the Safari and fixed-height tips are dropped with the code they described unless a later phase brings them back).

- [ ] Step 1: Find every stale line: `git grep -n -i "until rebuilt\|once rebuilt\|until its rebuild\|old names\|until it is rebuilt\|until it is migrated\|paused Laura\|Laura still\|laura.*old Next" -- . ':!docs/superpowers' ':!apps/laura/src'`, and `git grep -n "apps/laura/src" -- docs .claude AGENTS.md README.md packages`. List each hit with its edit.
- [ ] Step 2: Apply the edits above, one pointer per moved piece, no copies of code (`writing.md`), and no word for possibility but "might".
- [ ] Step 3: Run the same two greps: each remaining hit is one this task deliberately leaves (the Phase 7 lines: `vps.md`, the Production notes in `deployment.md`, the `aof-documentation` skill) and the checkpoint lists them.
- [ ] Step 4: `pnpm --filter @allonfire/config test` (the `root-scripts` test checks every `pnpm <script>` a doc names exists).

### Task 15: Review checkpoint

**Files:** none new; this task only runs the checks and fixes what they show.

- [ ] Step 1: `pnpm static:fix` (Ultracite, then both Apps' `tailwind:fix`), then `pnpm static:lint`.
- [ ] Step 2: `pnpm static:dupes`, `pnpm static:knip`, `pnpm static:knip-production`, `pnpm static:i18n`, `pnpm static:tailwind`, `pnpm static:design`, `pnpm static:types`, `pnpm static:workflows`, `pnpm static:migrate-image`. Any clone is merged into a package or, only where Next or next-intl forces the same lines, wrapped in `jscpd:ignore-start` / `-end` with its reason first, as the Back Office already does.
- [ ] Step 3: `pnpm install --frozen-lockfile`, then `pnpm turbo run check-types test --filter=@allonfire/laura --filter=@allonfire/back-office --filter=@allonfire/ui --filter=@allonfire/core --filter=@allonfire/auth --filter=@allonfire/design --filter=@allonfire/config` and `pnpm turbo run test:browser --filter=@allonfire/laura --filter=@allonfire/back-office --filter=@allonfire/ui`.
- [ ] Step 4: Proof of no Back Office regression and a working Laura: `pnpm test:services`, then `pnpm turbo run test:e2e --filter=@allonfire/back-office --filter=@allonfire/laura` (or `pnpm e2e:run`): every spec green on chromium, webkit, mobile-chrome and mobile-safari, no Back Office spec edited beyond a suite call.
- [ ] Step 5: Run the audit directly (Markdown is outside turbo's inputs): `pnpm --filter @allonfire/config exec vitest run local/tests/laura-parity-audit.test.ts local/tests/laura-app.test.ts`; `git ls-files apps/laura | wc -l` is far below 176 and `git status` lists the old files as deleted.
- [ ] Step 6: Boundary proof: `git grep -n "@allonfire/laura\|apps/laura" packages ':!packages/config' ':!packages/design/src/apps'` prints nothing but comments; `git grep -n "BACK_OFFICE\|LAURA" packages/ui packages/core packages/auth` prints nothing outside tests and the guard's `ALLOWED`; Phase 1's `packages-name-no-app.test.ts` passes.
- [ ] Step 7: Docs touched are the ones Task 14 lists; the owner reviews the diff before any commit (no commit here). Report the owner actions: GitHub secret `LAURA_URL` (`prod`, `dev`), `LAURA_URL` in `docker/.env.production` and Dokploy's env, Tailscale unchanged (the `svc:laura` Service and `3200` already exist), and the Phase 7 leftovers (`vps.md`, Production notes, the `aof-documentation` skill, the two `knip` "held only by Laura" entries for Phase 6 and 7).
