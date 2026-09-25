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
  tests/
    vitest.config.ts       Shared vitest options: globals, auto-restored mocks/env, v8 coverage, tags
    playwright.config.ts   Shared Playwright options (CI retries, forbidOnly, trace, `./e2e`)
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

// playwright.config.ts: defineConfig merges every argument, `use` included
import { playwrightConfig } from "@allonfire/config/tests/playwright";
import { defineConfig } from "@playwright/test";

export default defineConfig(playwrightConfig, { use: { baseURL: "http://localhost:3200" } });
```

What the vitest preset gives every package:

| Option | Effect |
|---|---|
| `globals` | `describe`, `it`, `expect`, `vi` need no import; list `vitest/globals` in the package tsconfig `types` |
| `restoreMocks`, `unstubEnvs`, `unstubGlobals` | every `vi.spyOn`, `vi.stubEnv`, `vi.stubGlobal` is undone before the next test |
| `tags` | every test file starts with `// @module-tag unit` (needs nothing running) or `// @module-tag integration` (needs a running service: database, cache, queue, external API; 30s timeout); `vitest.setup.ts` fails a file with neither. Type tests (`*.test-d.ts`) take no tag: `tsc` checks them, nothing executes, so every run includes them. Browser tests are Playwright's |
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
| `pnpm test:e2e` | Playwright, through turbo |

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
