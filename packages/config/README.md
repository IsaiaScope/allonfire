<h1 align="center">@allonfire/config</h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript 6.0" />
</p>

<p align="center">What every package and app is checked with: TypeScript and test presets, the check Stages, the Local addresses and the tests that read the whole repo.</p>

---

## 🔧 Use it

| I want to | Use |
|-----------|-----|
| type-check a package or app | extend `typescript/node.json`, `nextjs.json` or `base.json` |
| add tests to a package | merge `vitestConfig` (`@allonfire/config/tests/vitest`), and `@allonfire/config/tests/browser` for browser tests |
| set up a Next App's tests | `aofAppVitest`, `aofAppBrowserVitest`, `environmentSuite` |
| set up end-to-end tests | `aofPlaywrightConfig` (`@allonfire/config/tests/e2e`) |
| use a Local port or URL | `LOCAL` (`local/addresses.ts`) |
| read a file outside my package | `REPO` (`local/repo.ts`) |
| add a check to a Stage | `stages/stages.ts` |

A package's whole `vitest.config.ts`, from a Node package:

```ts
import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      // A Test database per run, dropped after (CONTEXT.md).
      globalSetup: [
        "@allonfire/database/features/test-database/utils/global-setup",
      ],
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["./vitest.setup.ts"],
    },
  })
);
```

## 🗂️ Where things are

```
typescript/    the tsconfig presets
local/         Local addresses, repo folders, the dev, check and env scripts
  tests/       checks that read the whole repo
stages/        the static, test, e2e and build Stages and their runner
tests/
  vitest/      the Node preset and a Next App's configs
  browser/     the browser preset and the MSW worker
  e2e/         the Playwright config and e2e helpers
  run/         names and cleanup for a test run's database and bucket
```

## ⚠️ Watch out

| Trap | What to do |
|------|------------|
| The tsconfig presets have no export key | Extend them by relative path: `"extends": "../config/typescript/node.json"` |
| `base.json` sets no `types` | A project that extends it directly lists its own |
| A package uses these presets without depending on this one | List `@allonfire/config` as a dev dependency, or Turbo replays old results after a change here |
| This package imports no other workspace package | Pass in what it needs, as `aofPlaywrightConfig` takes the API's paths |
| A test here reads a file outside the package | List it in this package's `turbo.json` test inputs, or Turbo replays a stale pass |

## 🧪 Run and test

From the repo root. The `test` and `e2e` Stages need Docker.

| Command | Runs |
|---------|------|
| `pnpm check` | the `static`, `test` and `e2e` Stages |
| `pnpm test` | the `test` Stage |
| `pnpm test:unit` | unit tests only, no Docker |
| `pnpm test:ui` | the Vitest UI with coverage |
| `pnpm e2e` | browser tests, then end-to-end |
| `pnpm e2e:ui` | Playwright's UI |
| `pnpm --filter @allonfire/config test` | this package's own tests |

## 📚 More

- [Testing](../../docs/guides/testing.md): test layers, Test databases, the Stages, headed runs
- [Code style](../../docs/guides/code-style.md): what each compiler option catches, and why TypeScript 6.0
- [Package layout](../../docs/guides/package-layout.md)

---

<p align="center">
  ⬅️ <a href="../../README.md">Back to monorepo root</a>
</p>
