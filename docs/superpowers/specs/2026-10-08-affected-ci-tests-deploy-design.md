# Affected-only CI, browser and e2e tests, modular deploy

**Status:** approved in chat, 2026-10-08

## Why

- CI runs every task for every package on every PR, so a one-line Back
  office change pays for the API, database and storage suites too.
- No end-to-end test runs in CI. The Back office's only Playwright spec is a
  smoke test against `next dev`, without the API.
- UI tests render to static markup and match regexes: no DOM, no clicks, no
  way to see what a component shows when the API answers.
- Production is one Dokploy compose project that builds on the VPS (8 GB, no
  swap). Every deploy rebuilds everything, and the API and Back office are
  not deployed at all yet.

## Outcome

1. A PR runs type checks, tests and builds only for the packages it changed
   and everything that depends on them, with the Turbo remote cache on top.
2. Three test layers, each with one job:

   | Layer | Tool | Proves |
   |---|---|---|
   | Unit | Vitest, Node (today's) | logic, schemas, handlers |
   | UI integration | Vitest browser mode, `vitest-browser-react`, `msw/browser` | a client component in a real Chromium: clicks, states, what it shows for each API answer |
   | End to end | Playwright Test, shared preset | whole flows on the real stack (API, database, Redis, MinIO, a built App) |

3. A merge to `prod` deploys only the affected units, built in CI as images,
   run by Dokploy. A change to a shared package deploys every App that reads
   it.

## Decisions

- **One spec, one plan, three phases** (affected CI, tests, deploy), in that
  order: the tests' CI job and the deploy both read the affected list phase 1
  produces.
- **Turbo decides what is affected.** Its package graph is the only thing
  that knows `packages/auth` feeds the API and the Back office; path globs
  would have to list that by hand.
- **Browser mode, not jsdom**, for UI tests. Real Chromium (through
  Playwright) means real layout, focus and events, and `msw/browser`
  intercepts the browser's own `fetch`. Browser mode renders one component in
  a Vite iframe: no Next server, Server Components, server actions, `proxy.ts`
  or navigation. Whole flows stay Playwright's.
- **MSW sees only `fetch`.** A form posting to a server action never fetches
  from the browser; its browser test mocks the action with `vi.mock`, and the
  e2e test covers the real round trip. MSW is for components that call the
  API through the `hc` client or TanStack Query.
- **E2e runs against the full stack**, production builds, real sign-in.
- **CI builds the images; Dokploy only runs them.** Private images in GHCR;
  builds leave the VPS. One compose project from images, so Docker restarts
  only what changed and `depends_on` keeps migrate-before-Apps.
- **`prod` only.** `dev` and `test` stay CI-only; no staging environment.
- **Laura leaves production** until its rebuild (paused, ADR 0010); it stays
  outside the workspace and the affected list.

## Phase 1: affected-only CI

`.github/workflows/ci.yml`:

- `actions/checkout` with `fetch-depth: 0` in every job that runs Turbo, so
  `--affected` can diff against `GITHUB_BASE_REF`.
- `check-types`, `test` and `build` run as `pnpm turbo run <task> --affected`.
  A change to a global input (lockfile, `turbo.json`, root config) marks every
  package affected; Turbo already does this.
- Biome lint, `i18n:check`, shellcheck and `design:sync --check` stay
  repo-wide: seconds each, and a wrong skip costs more than they save.
- A `changes` job runs `pnpm turbo ls --affected --output=json` once and
  publishes two outputs for later jobs:
  - `apps`: affected Apps (`api`, `back-office`), the e2e job's input.
  - `deploy`: affected deploy units, phase 3's input (`db-migrate` is a unit
    whenever `@allonfire/database` is affected).
- A small package, `@allonfire/ci`, turns Turbo's JSON into those two lists
  so the mapping (package name to unit) lives in one tested place. It is its
  own package because it reads core's helpers and core already depends on
  `@allonfire/config`.

## Phase 2: tests

### Shared Vitest preset (`packages/config/tests/vitest.config.ts`)

- Gains a sibling, `vitest.browser.config.ts` (`vitestBrowserConfig`):
  includes `src/**/*.browser.test.{ts,tsx}`, `browser: { enabled: true,
  headless: true, provider: playwright(), instances: [{ browser: "chromium" }] }`.
  The Node config excludes `**/*.browser.test.*`. A separate file, not
  `projects`: Vitest allows `projects` only in the root config, and each
  package config is already one root project.
- The tag check runs in both configs; a browser test starts with
  `// @module-tag integration`.
- New dev dependencies: `@vitest/browser-playwright`, `vitest-browser-react`,
  `msw` (all above 1M weekly downloads).
- The existing `aof-get-query-client.browser.test.ts` in core runs in Node
  with a mocked `isServer`; it is renamed `*.client.test.ts` so the new
  suffix means what it says.

### MSW

- Each App owns its handlers in `src/shared/tests/msw/handlers.ts`: a
  package must not fake an App's API (CLAUDE.md, packages never import Apps).
- The browser setup file starts `setupWorker(...handlers)` once with
  `onUnhandledRequest: "error"`, resets handlers after each test, and serves
  `mockServiceWorker.js` from the App's `public/` (generated by
  `msw init`, committed).
- A test overrides one answer with `worker.use(...)`.

### Shared Playwright preset (`packages/config/tests/playwright.config.ts`)

- `aofPlaywrightConfig({ app, port })` replaces the bare `playwrightConfig`:
  - keeps today's options (`forbidOnly`, retries, reporter, `testIgnore`);
  - `baseURL` from `port`, one Chromium project;
  - `webServer`: the API (port 3300) and the App, `reuseExistingServer`
    locally; in CI the commands start the production builds (`next start`,
    the API's `start`).
- `apps/back-office/playwright.config.ts` becomes one call.
- `apps/api` gets a `start` script (`tsx src/index.ts`, no watch, no
  `--env-file`), shared by the e2e web server and the image.
- Every package with browser tests gets a `test:browser` script
  (`vitest run --project browser`); `turbo.json` gains the task, cached
  like `test`. `test` becomes `vitest run --project node`.

### First tests (Back office)

- E2e (`apps/back-office/e2e/`):
  - an ADMIN signs in and lands home;
  - a User whose Back office Membership is under its floor (USER) is
    refused and sees the forbidden message;
  - sign-out returns to sign-in;
  - the existing smoke spec stays.
- Browser test: the sign-in form's pending state and each error message
  (action mocked).

### CI `e2e` job

- `needs: changes`; runs only when `changes.outputs.apps` is not empty.
- Services: Postgres, Redis and MinIO from `docker/docker-compose.dev.yml`
  (`up --wait`, with `minio-init` creating the bucket), the same stack Local
  runs.
- Steps: install, `db:generate`, `db:update`, seed with
  `DATABASE_SEED_MODE=dev`, `playwright install chromium --with-deps`
  (cached by Playwright version), build the affected Apps, then
  `pnpm turbo run test:browser test:e2e --affected`.
- Env: the API's required vars with test values, `API_CORS_ORIGINS` holding
  `http://localhost:3400`, the Back office's `API_URL`, `API_AUTH_URL` and
  `NEXT_PUBLIC_API_URL` pointing at `http://localhost:3300`.
- Playwright traces upload as an artifact on failure.
- Browser-mode tests run here (they need Chromium); the plain `test` job
  runs the `node` project only.

## Phase 3: modular deploy (`prod`)

- New workflow `.github/workflows/deploy.yml`, on push to `prod`.
- Reuses the `changes` logic against the previous `prod` commit
  (`--affected` with `TURBO_SCM_BASE=${{ github.event.before }}`).
- Per affected deploy unit, build and push
  `ghcr.io/isaiascope/allonfire-<unit>:<sha>` and `:prod` (private images):
  - `back-office`: `docker/Dockerfile`, the Next standalone runner; its
    build args (`STORAGE_ENDPOINT`, `NEXT_PUBLIC_API_URL`) come from the
    `prod` environment's secrets.
  - `api`: `docker/Dockerfile` gets a `node` runner target; the API has no
    `server.js`. It runs `tsx src/index.ts` (ponytail: bundle if start time
    ever matters).
  - `db-migrate`: `packages/database/liquibase/Dockerfile`.
- `docker/docker-compose.prod.yml` stays the one Dokploy compose project and
  runs images, not builds: every service gets
  `image: ghcr.io/isaiascope/allonfire-<unit>:prod` and
  `pull_policy: always`. It holds `db-backup`, `db-migrate`, `api`,
  `back-office` and `minio`.
- After the pushes, one call to Dokploy's API (`compose.deploy`, with the
  `DOKPLOY_API_KEY` secret and the `DOKPLOY_COMPOSE_ID` variable) redeploys
  the project. `docker compose up` recreates only the services whose image
  changed, so an unaffected App keeps running untouched. `depends_on` keeps
  the order: `db-backup`, then `db-migrate`, then the Apps. The backup runs
  on every deploy; `db-migrate` is a no-op without new changesets.
- Nothing affected: no image is built and Dokploy is not called.
- Dokploy's own auto-deploy on git push is turned off; CI calls it once the
  images exist. Dokploy gets a GHCR login with a read-only (`read:packages`)
  token.
- Laura leaves the production compose file until its rebuild;
  `laura.isaiariva.com` goes down at the first deploy.
- GHCR is free for now; a cleanup step keeps the last 10 `<sha>` tags per
  image, so a future quota is never hit.
- Rollback: retag an older `<sha>` as `:prod` and redeploy.
- ADR 0018 records CI-built images and the CI-triggered deploy; it amends
  ADR 0005's "Dokploy deploys by git push".

## Error handling

- `turbo ls --affected` failing (shallow clone, missing base) fails the
  `changes` job; it never falls back to "nothing affected".
- A failed `db-backup` or `db-migrate` stops the compose project before any
  App is recreated (`service_completed_successfully`); the old containers keep
  serving.
- A failed image build or push fails the workflow before Dokploy is called.

## Testing the pipeline itself

- `@allonfire/ci` has unit tests: an App change, a shared package
  change, a database change (adds `db-migrate`), a root change (everything).
- The workflows are checked by running them on the PR that introduces them;
  `actionlint` runs in `lint-types`.

## Out of scope

- A staging environment.
- Laura's tests and deploy.
- Visual regression and accessibility audits.
- Bundling the API.
