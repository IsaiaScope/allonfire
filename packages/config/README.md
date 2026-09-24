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
