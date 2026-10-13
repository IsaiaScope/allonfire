<h1 align="center">@allonfire/config</h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript 6.0" />
</p>

<p align="center">Shared TypeScript configuration presets for the monorepo.</p>

## 📁 Structure

```
config/
  typescript/
    base.json              Base config: strictest checks, ESM, bundler resolution, no emit
    node.json              Node code (extends base + Node types, ES2022 lib, no emit)
    nextjs.json            Next.js app config (extends base + DOM lib, JSX, plugin, Node types)
  local/
    addresses.ts           LOCAL (PORT, URL, DATABASE, STORAGE), API_PATH, TEST_API_URL: every Local and test address, once
    tests/                 local-files.test.ts checks compose, CI, the .env.example files and the Apps' --port against it
  tests/                   One folder per test layer
    vitest/
      vitest.config.ts     Unit and integration tests in Node: globals, auto-restored mocks/env, v8 coverage, tags
      vitest.setup.ts      Fails a test file with no `// @module-tag`
    browser/
      vitest.browser.config.ts   Browser tests (`*.browser.test.tsx`) in headless Chromium and WebKit
      msw.ts               One MSW worker: `startMsw(...handlers)` in the App's setup, `worker.use(...)` in a test; an unanswered request fails the test
    e2e/
      playwright.config.ts End-to-end: `aofPlaywrightConfig` builds and starts the App plus the API (`./e2e`) on the run's Test database and bucket, and runs each spec in Chromium and WebKit, desktop and phone
      global-teardown.ts   Drops them
      run.ts               E2E_LABEL, the e2e run's label beside its stamp
    run/
      test-run.ts          `testRunStamp()` names a run's Test database and bucket; `isStaleTestRun(name, now)` finds a crashed run's, over a day old; `runsIntegration(tagsFilter)` says whether a run needs them
```

## 🔧 Usage

Each app or package extends the appropriate preset:

```json
// Next.js apps (apps/laura)
{
  "extends": "@allonfire/config/typescript/nextjs.json"
}

// Node packages and apps (packages/database, apps/api)
{
  "extends": "@allonfire/config/typescript/node.json"
}

// Custom (extend base directly)
{
  "extends": "@allonfire/config/typescript/base.json"
}
```

## Test presets

A package merges its own options on top of the shared ones:

```ts
// vitest.config.ts
import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(vitestConfig, defineConfig({ test: { setupFiles: ["./vitest.setup.ts"] } }));

// vitest.browser.config.ts (an App): `*.browser.test.tsx` in headless Chromium and WebKit
import { vitestBrowserConfig } from "@allonfire/config/tests/browser";

export default mergeConfig(vitestBrowserConfig, defineConfig({ test: { setupFiles: ["./vitest.browser.setup.ts"] } }));

// playwright.config.ts: the App's production build (standalone server) on its
// e2e port plus the API on 3310, beside `pnpm dev`, the same locally and in CI
import { LOCAL } from "@allonfire/config/local/addresses";
import { aofPlaywrightConfig } from "@allonfire/config/tests/e2e";

export default aofPlaywrightConfig({ app: "back-office", env: { AUTH_APP: "BACK_OFFICE" }, port: LOCAL.PORT.BACK_OFFICE_E2E });
```

What the vitest preset gives every package:

| Option | Effect |
|---|---|
| `globals` | `describe`, `it`, `expect`, `vi` need no import; list `vitest/globals` in the package tsconfig `types` |
| `restoreMocks`, `unstubEnvs`, `unstubGlobals` | every `vi.spyOn`, `vi.stubEnv`, `vi.stubGlobal` is undone before the next test |
| `tags` | every test file starts with `// @module-tag unit` (needs nothing running) or `// @module-tag integration` (needs a running service: database, cache, queue, external API; 30s timeout); `vitest.setup.ts` fails a file with neither. Type tests (`*.test-d.ts`) take no tag: `tsc` checks them, nothing executes, so every run includes them. Browser tests (`*.browser.test.tsx`) are `integration` and run only under the browser config |
| `silent: "passed-only"` | console output from passing tests is hidden; a failing test prints its console output |
| `passWithNoTests` | a package with no tests yet still passes |
| `coverage` | v8, off until `--coverage` |

Root scripts run every package as one vitest run (`vitest.config.ts` lists
them as projects):

| Script | Runs |
|---|---|
| `pnpm test` | each package through turbo, cached |
| `pnpm test:unit` | tests tagged `unit`: no Docker needed |
| `pnpm test:integration` | tests tagged `integration` |
| `pnpm test:coverage` | everything, one merged report in `coverage/` |
| `pnpm test:ui` | the Vitest UI with coverage on :51204. It runs nothing at start (`--standalone`), only what a save touches; press Run all in the UI for the full suite |
| `pnpm dev` | runs `test` through turbo (unchanged packages come from cache, a change re-runs that package) next to the apps and the UI |
| `pnpm test:e2e` | Playwright, through turbo, cached: an App re-runs only when it or a package it reads changed |

End-to-end tests run each spec once per project, on one build and one Test
database:

| Project | Engine | Device | Stands for |
|---|---|---|---|
| `chromium` | Chromium | Desktop Chrome | Chrome, Edge |
| `webkit` | WebKit | Desktop Safari | Safari on a Mac |
| `mobile-chrome` | Chromium | Pixel 7 | Android |
| `mobile-safari` | WebKit | iPhone 15 | Safari and every other browser on iOS |

WebKit is Safari's engine, not Safari: it shows layout, CSS and JavaScript
differences, not what only a real iPhone does (the collapsing toolbar, the
keyboard, safe areas). Browser tests run each component in Chromium and
WebKit.

Every run is headless. To watch one, from the root (every App that has the
script, one after another, never through turbo: nothing to cache) or for one
App with `pnpm --filter @allonfire/<app>`:

| Script | Shows |
|---|---|
| `pnpm test:e2e:headed` | each project's browser window while its specs run |
| `pnpm test:e2e:ui` | Playwright's UI: pick a spec and project, step through its actions |
| `pnpm test:browser:headed` | the browser tests' Chromium and WebKit windows |

Narrow a run with Playwright's own flags after the script name:
`pnpm test:e2e:headed --project=mobile-safari -g "signs in"`.

The package must list `@allonfire/config` as a dev dependency. Turbo's cache
key follows declared dependencies, so a change here re-runs its tests and type
checks.

## Node Types

`base.json` sets no `types`, so what it sees of `@types/*` depends on
where TypeScript is run from. `node.json` and `nextjs.json` list `"types": ["node"]`
explicitly: `process`, `Buffer` and `node:*` resolve the same in the editor, in
`tsc` and in CI. `@types/node` is installed once, at the repo root. Every
package has a `check-types` script, so `pnpm check-types` covers all of them.

## Strictness

`base.json` turns on everything below on top of `strict`. Each one catches a
bug class the others don't:

| Option | Catches |
|---|---|
| `noUncheckedIndexedAccess` | `arr[i]` and `record[key]` read as `T \| undefined`, not `T` |
| `exactOptionalPropertyTypes` | `{ a?: string }` means "absent or a string", never an explicit `undefined`; write `?: string \| undefined` where a caller may pass one |
| `noImplicitOverride` | an overriding method must say `override` |
| `noImplicitReturns` | a function that returns on some paths must return on all |
| `noFallthroughCasesInSwitch` | a non-empty `case` must end in `break`, `return` or `throw` |
| `noUnusedLocals`, `noUnusedParameters` | dead code (Biome reports it too; prefix an intentionally unused parameter with `_`) |
| `allowUnreachableCode: false`, `allowUnusedLabels: false` | code after `return`, labels nothing jumps to |
| `verbatimModuleSyntax` | type-only imports must say `import type`, so nothing is imported at runtime by accident |
| `erasableSyntaxOnly` | no `enum`, `namespace` or parameter properties: every file is valid once types are stripped (what `tsx` and Node's type stripping do) |
| `noUncheckedSideEffectImports` | `import "./x"` must resolve; `*.css` is declared in `apps/laura/src/types/css.d.ts` |
| `moduleDetection: "force"`, `isolatedModules` | every file is a module and compiles on its own |

Left out on purpose:

- `noPropertyAccessFromIndexSignature`: it requires `obj["key"]`, which
  Biome's `useLiteralKeys` rewrites to `obj.key`. `noUncheckedIndexedAccess`
  already carries the safety.
- `declaration`, `sourceMap`, `incremental`: nothing is emitted by `tsc`
  (Next builds with SWC, the API runs through `tsx`), so every preset is
  `noEmit`.

## TypeScript Version

TypeScript 6.0: the last JavaScript-based release, whose deprecations are
exactly what 7.0 removes, so this config is ready for 7. The move to 7.0 (the
native compiler) waits for its JavaScript API, which Next.js' editor plugin and
type-check integration still load, and for Next.js 16.3+.
