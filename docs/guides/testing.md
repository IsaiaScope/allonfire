# Testing

Test layers, the Test database, e2e, the pre-commit hook.

Tests live beside what they test: the feature's `tests/`, or
`shared/<kind>/tests/` for shared helpers. A feature checked through the whole
middleware chain still lives in its own `tests/` and builds the app with
`createApp(appDeps())` (`shared/tests/app-deps.ts`). Only `client` and
`shutdown` keep root-level tests.
A vi.mock factory, stub or fixture that a second test file needs moves to the
area's shared/tests (exported when another package needs it, as stub-auth and
stub-image-deps are) instead of being copied. The HTTP modules' tests share
auth's `moduleTestHost` (`@allonfire/auth/shared/tests/test-host`).
Tests write HTTP statuses, methods, headers and media types through core's
`HTTP` (`HTTP.STATUS.FORBIDDEN`, `HTTP.HEADER.COOKIE`), never as numbers or
strings. Tests read copy from its source: the App's translations through
`createTranslator` (the Back Office's `enT`/`itT`, `src/shared/tests/translators.ts`,
which fills ICU placeholders: never `.replace("{email}", …)`), the API's
`translate()` or `TRANSLATION.CATALOGUE`, `API.LOG_MESSAGE`, and Better Auth's
cookie names from `AUTH.COOKIE`; only a renderer's own test pins rendered text.
A markup test asserts roles, text and attributes a visitor depends on, never
Tailwind class strings.
An Image Fixture's bytes come from storage's `readFixtureImage(IMAGE_FIXTURE.FILE.*)`. A browser test fetches one through Vite's `?url` import of
`@allonfire/storage/features/image/fixtures/files/<file>?url`, typed by
config's `tests/browser/asset-url` (listed in the package's tsconfig `types`),
never a `new URL` climbing `..` into another package.
Vitest runs with globals (no `from "vitest"` import). Every test file's first
line is `// @module-tag unit` or `// @module-tag integration`; a file with
neither fails. Integration tests need a running service (database, cache,
queue, external API) and are named
`*.integration.test.ts`. They never touch the Local database: a Vitest
`globalSetup` clones a Test database per package per run from the template
(`allonfire_test_template_<epoch>_<fingerprint>`: the changelog plus the
Fixtures, a new one when `changelog/`, `liquibase/` or `src/features/seed/`
change) and a bucket per run holding the
Image Fixtures, and drops both when the run ends (`dropWhenRunEnds`); a
run killed first leaves them, named with its process id, and the next run
drops those whose process is gone (`isStaleTestRun`); e2e does the same per Playwright run, and drops an
earlier e2e run's leftovers when it starts. A test signs in as a Fixture (`FIXTURE.USER.BACK_OFFICE.ADMIN`
with `FIXTURE.PASSWORD`, which meets the password rules; `FIXTURE.NEW_PASSWORD` for a change) and points at an Image Fixture, never a retyped
email or key; local addresses come from `@allonfire/config/local/addresses`
(`LOCAL.URL`, `LOCAL.PORT`; `LOCAL.URL.TEST_API`, the host MSW answers), checked against compose, CI and
the `.env.example` files by its guard test. Type tests (`*.test-d.ts`) take no tag: `tsc`
checks them and nothing executes. Three layers: unit and integration tests run
in Node (`vitest.config.ts`); browser tests (`*.browser.test.tsx`,
`integration`) render one client component in real Chromium and WebKit through
`vitest.browser.config.ts`. The Back Office and `packages/ui` have them. An
App's run wears the App's stylesheet. ui's wears ui's base plus the Japan
Design's `theme.css` (`src/shared/tests/browser.css`), never an App's. A
look a visitor sees (a corner, a height, padding, an overflow axis, a
transition) is asserted from `getComputedStyle` against the token it should
wear, through ui's `@allonfire/ui/shared/tests/computed-style`
(`computedValue`, `colorAlpha`, `seconds`, `roundestCorner`) and
`emulated-media` (`withReducedMotion`, `withCoarsePointer`; Chromium only,
`CAN_EMULATE_MEDIA`, as are the notch tests through
`Emulation.setSafeAreaInsetsOverride`); a value that animates is read with
`expect.poll`. An App's browser tests have MSW answering the API: the worker and its
guard are shared (`@allonfire/config/tests/browser/msw`: `startMsw`,
`worker`), the handlers are the App's own (`src/shared/tests/msw/handlers.ts`),
and a request no handler answers fails the test; ui fakes no API. Vitest serves MSW's
`mockServiceWorker.js` from the installed `msw`; no App keeps one in
`public/`, where it would ship to production; e2e
tests are Playwright's, under the App's `e2e/`, against the API plus the App
(`aofPlaywrightConfig`), each spec once per project: `chromium`, `webkit`,
`mobile-chrome` (Pixel 7) and `mobile-safari` (iPhone 15). Both layers are
headless; `pnpm e2e:headed`, `pnpm e2e:ui` and
`pnpm e2e:browser:headed` show the browser. A server action is mocked in a browser test and
covered for real by e2e. CI runs the browser tests of every affected package
that has them (an App, ui: the `affected` job's `browser` output) and e2e
tests for the affected Apps. Every App has an `e2e/safe-area.spec.ts` that
checks each of its pages against the notch (`design-system.md`), and a new
App adds one.

Every check sits in one **Stage** (`CONTEXT.md`): `static`, `test`, `e2e`
or `build`, each one root command (`pnpm static`, …) that runs the same on a
Mac, in the pre-commit hook and in CI; `pnpm check` runs `static`, `test` and
`e2e` in order. What each Stage runs, in order, and why, is one list:
`packages/config/stages/stages.ts`; every tool in it is a root script runnable
alone (`pnpm static:knip`, `pnpm e2e:run`, …). A Stage stops at its first
failing tool; CI adds `--keep-going` (every tool reported) and `--affected`
(Turbo's tools only), and each tool prints its result and time. `test` and
`e2e` start the Test services first (`pnpm test:services`: the database,
Redis, storage, the image server and the cdn, waited for; Docker must be
running), never the rest of Local. The pre-commit hook
(`.husky/pre-commit`) runs lint-staged on the staged files (Tailwind classes,
then Biome's fixes; errors and warnings fail), then `pnpm check`. e2e runs the
App's production build, served like the Docker image (standalone server),
plus the API, on their own ports (3310 and the App's e2e port) beside
`pnpm dev`, the same locally and in CI. Turbo's cache replays every task
whose package and dependencies did not change, e2e included, and the remote
cache lets CI replay an e2e run that passed
locally. A package test that reads a repo file outside its package lists that
file in the package's turbo `test` inputs. oxlint runs one rule, `typescript/no-deprecated`
(`.oxlintrc.json`): a deprecated API, members included, fails `pnpm static:lint`;
Biome's `noDeprecatedImports` sees only imports. Fix the use, never silence
it; a deprecated name a library's own type still requires goes in the rule's
`allow` list with the reason.

## Pointers

- Apply Biome fixes only to touched files, then run `pnpm static:types`, `pnpm static:lint` and `pnpm test`; fix lint rather than adding a Biome suppression without the owner's approval. Configuration: `biome.jsonc`, `.oxlintrc.json`, `packages/config/typescript/base.json`.
- Only the e2e build sets `CONFIG_E2E_TESTING_API`, which turns on Next's `exposeTestingApiInProductionBuild` for `instant()` tests; an image that serves traffic never has it: `packages/config/tests/e2e/playwright.config.ts`. (`docs/superpowers/specs/2026-11-02-instant-users-navigation-design.md`)
- The Vitest preset's options, the root test scripts (`test:unit` needs no Docker, `test:integration`, `test:coverage`, `test:ui`), the e2e projects and the headed scripts: `packages/config/README.md`.
- The `static` Stage also runs ShellCheck on the Liquibase scripts, `docker build --check` on the `db-migrate` image and actionlint on the workflows (a Mac without the binary skips the tool; CI has them all); the `test` Stage checks the changelog against the Prisma schema on the Test template (`pnpm test:drift`): `packages/config/stages/stages.ts`.
- The `static` Stage runs `pnpm static:knip`, `pnpm static:knip-production` and `pnpm static:dupes` in the hook and on every PR, over the whole workspace (no affected-filter): an unused export or file, code only tests use, or a clone fails it wherever it sits. Fix the hit, or accept it with a reason (`tooling.md`, knip and jscpd): `.github/workflows/ci.yml`.
