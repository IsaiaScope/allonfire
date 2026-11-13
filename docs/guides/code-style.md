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

- A component that wraps another takes the wrapped component's props (`ComponentProps<typeof X>`, minus what it sets itself) plus only the few it adds, and spreads the rest (`{...props}`); it never lists `children`, `className`, `disabled` and the like one by one, so its props stay few. Example: `apps/back-office/src/features/auth/components/gate-submit.tsx`.
- An animation that changes layout (width plus content plus timing) uses Framer Motion (`motion`, `AnimatePresence`, `layout`); CSS transitions are for one property; never coordinate with `setTimeout`. Example: `apps/laura/src/components/motion-provider.tsx`.
- Every `<img>` or `<Image>` gets `width` and `height`, or `fill` inside a sized box, so nothing shifts as it loads. Example: `packages/ui/src/shared/components/aof-image.tsx`.

## CSS

- A page that must fit the viewport passes height down a `flex-1 flex-col` chain from `body`, never a `100dvh` or `100svh` calc. Example: `apps/laura/src/app/[locale]/(dashboard)/games/memory/page.tsx`.
- iOS Safari: set `WebkitBackdropFilter` beside `backdropFilter` (Tailwind's `backdrop-blur` adds no prefix), mix colours `in srgb`, not `oklch`, and do not trust viewport units. Example: `apps/back-office/src/shared/components/torii.tsx`.

- **A class is never a constant.** Tailwind classes are written inline in `cn(...)`, or, when they have states or a second reader, in a `cva` (a skeleton and its live twin, three cards' badge: `cardBadge`, `shared/utils/card-badge`). Never `const BADGE = "sm:h-7 ..."`, never a `className` key in a constants object (`CHART.TICK`), never a class list copied from one component to another. A prop that must be an object holding a class (a chart's `tick`) is built from a `cva`: `const TICK = { className: tickText() }`. Example: `packages/ui/src/features/chart/components/aof-bar-chart.tsx`.

## Values on screen

- Never join values with a middle dot (`·`) or any separator character (`0.01 MB · 800 × 1200`). Each value sits under its own small label in a `dl` grid (label muted, `text-xs uppercase`; value `font-semibold`, `font-mono tabular-nums` for numbers), and a list of names is joined with `SEPARATOR.NAMES` (a comma). Example: `apps/back-office/src/features/images/components/image-card.tsx`.
- A size is always `formatSize` from core (`@allonfire/core/shared/utils/format-size`): MB, then GB and TB, two decimals; never a hand-written unit.
