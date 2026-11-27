<h1 align="center">@allonfire/shadcn</h1>

<p align="center">
  <img src="https://img.shields.io/badge/shadcn-4-000000?logo=shadcnui&logoColor=white" alt="shadcn 4" />
  <img src="https://img.shields.io/badge/Base_UI-1-000000" alt="Base UI" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind 4" />
</p>

<p align="center">The components the shadcn CLI generates. Only tools write its source: nobody edits it by hand.</p>

---

## 🔧 Use it

Only `@allonfire/ui` imports from here.

| I want to | Do |
|-----------|----|
| add or update a component | the two commands below |
| add one from React Bits | run `pnpm dlx shadcn@4.21.0 add <url>` in `packages/shadcn` |
| change how a component looks or behaves | wrap it in an `AOF…` component in `packages/ui` |
| fix something only the generated file can fix | add a `VENDOR_PATCHES` entry (`packages/core/src/features/vendor/vendor-patches.ts`) |
| take a file that is not strict TypeScript | list it in a lenient tsconfig in `src/components/` and in this package's `exclude`, then run `vendor:types` |

```bash
cd apps/back-office                            # its components.json points here
npx shadcn@4.21.0 add <name>
pnpm --filter @allonfire/shadcn canonicalize   # canonical Tailwind classes, then the vendor patches
```

## 🗂️ Where things are

```
components.json       the CLI's settings
src/
  components/         generated components, lenient tsconfigs, generated .d.ts files
  hooks/              generated hooks
  lib/                generated helpers
  styles/             shadcn's tokens, which ui's base.css imports
```

## ⚠️ Watch out

| Trap | What to do |
|------|------------|
| A hand edit is lost on the next update | Wrap in `ui`, or add a vendor patch |
| `canonicalize` fails on a patch the CLI's code no longer matches | Update that `VENDOR_PATCHES` entry, or remove it if the fix is no longer needed |
| A `.d.ts` here is generated too | Run `vendor:types`, do not edit it |
| An update breaks a strict flag in a component `ui` imports | `ui`'s type check fails: add the file to `src/components/tsconfig.relaxed.json` and the `exclude`, then run `vendor:types` |
| A component is in two tsconfig lists, in none, or has no `.d.ts` | `ui`'s `shadcn-compat` test fails |
| `GooeyNav.tsx` is not the one in use | `ui` has its own fork; this copy stays to compare updates against |

## 🧪 Run and check

```bash
pnpm --filter @allonfire/shadcn check-types    # the strict tsconfig and both lenient ones
pnpm --filter @allonfire/shadcn vendor:types   # rewrite the .d.ts files
```

## 📚 More

- [Design system](../../docs/guides/design-system.md): the whole install and update routine
- ADR: [shadcn stays generated, AOF components sit on top](../../docs/adr/0010-shadcn-generated-aof-components-on-top.md)

---

<p align="center">
  ⬅️ <a href="../../README.md">Back to monorepo root</a>
</p>
