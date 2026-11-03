# Code style

TypeScript, React and CSS rules that no linter enforces. Helpers and constants: `conventions.md`. Folders and exports: `package-layout.md`. Components and classes: `design-system.md`.

## What the tools enforce

- Biome (`biome.jsonc`): the Ultracite presets (core, react, next, vitest, type-aware) plus `noFloatingPromises`, `noMisusedPromises`, `useExhaustiveSwitchCases`, `noReExportAll`, `noExcessiveLinesPerFile`, `useMaxParams`, `noImplicitCoercions`; `noProcessEnv` is off only in the files its override lists (environment files, tests, e2e).
- oxlint (`.oxlintrc.json`): only `typescript/no-deprecated`, type-aware; ignores Laura, `*-old` packages and generated shadcn code.
- TypeScript (`packages/config/typescript/base.json`): `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, unused locals and parameters as errors.

## TypeScript

- Name files kebab-case; a type-only test ends in `.test-d.ts`. Example: `packages/core/src/shared/utils/json.ts`.
- Narrow instead of casting, in this order: a type guard, `schema.parse()` for anything from outside (JSON, responses, Redis, env), `as const satisfies Record<K, V>` for lookup tables, `as const` for template literals, a generic that keeps a literal input literal. Example: `apps/api/src/shared/constants/error.ts`.
- Wrap an untyped standard API in a generic core helper so types flow through: `unknown` by default, `NoInfer` so an annotation never sets `T` silently, overloads rather than casts. Example: `packages/core/src/shared/utils/json.ts`.
- Never add a `biome-ignore`: restructure until the rule passes, and ask the owner when it truly cannot. The one sanctioned case is a package entry barrel. Example: `packages/database/src/index.ts`.

## React

- An animation that changes layout (width plus content plus timing) uses Framer Motion (`motion`, `AnimatePresence`, `layout`); CSS transitions are for one property; never coordinate with `setTimeout`. Example: `apps/laura/src/components/motion-provider.tsx`.
- Every `<img>` or `<Image>` gets `width` and `height`, or `fill` inside a sized box, so nothing shifts as it loads. Example: `packages/ui/src/shared/components/aof-image.tsx`.

## CSS

- A page that must fit the viewport passes height down a `flex-1 flex-col` chain from `body`, never a `100dvh` or `100svh` calc. Example: `apps/laura/src/app/[locale]/(dashboard)/games/memory/page.tsx`.
- iOS Safari: set `WebkitBackdropFilter` beside `backdropFilter` (Tailwind's `backdrop-blur` adds no prefix), mix colours `in srgb`, not `oklch`, and do not trust viewport units. Example: `apps/back-office/src/shared/components/torii.tsx`.
