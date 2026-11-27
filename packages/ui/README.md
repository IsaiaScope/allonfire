<h1 align="center">@allonfire/ui</h1>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Base_UI-1-000000" alt="Base UI" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind 4" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript 6.0" />
</p>

<p align="center">The components the apps share, each named <code>AOF…</code> and built on the shadcn ones. They know no Design: an app hands in its own look.</p>

---

## 🔧 Use it

Import a component from its own file: there is no barrel.

| I want to | Use |
|-----------|-----|
| style an app | import `@allonfire/ui/styles/base.css` before the app's Design stylesheet |
| build a form | `useAOFForm` (`features/form/utils/form`) |
| show a list as a table | `AOFDataTable` (`features/data-table/components/`) |
| draw the signed-in frame | `AOFAppFrame`, fed the app's `AppDescriptor` |
| write an email | `AOFEmail` and its renderer (`features/email/`) |
| test an app | the helpers in `shared/tests/` and the suites in `features/app/tests/e2e/` |

A button as tall as a form field:

```tsx
import { AOFButton } from "@allonfire/ui/shared/components/aof-button";

<AOFButton
  className={kanjiAction()} // the app's own look
  onClick={act}
  size="field"
  type="button"
>
```

## 🗂️ Where things are

```
src/
  features/
    app/          the page document an app renders, and shared e2e suites
    auth/         sign in, password and email pages, and their frame
    chart/        bar chart and radial meter
    data-table/   the list table, filter panel, pagination, bulk delete
    email/        the email template and its renderer
    feedback/     notices, error pages, empty state, toaster
    form/         the form hook and its fields
    image/        avatar, lightbox, upload, export, generated images
    navigation/   frame, sidebar, app switcher, account menu, breadcrumb
    pwa/          install hint and offline banner
    query/        query provider and views
    theme/        theme toggle and the theme colour of the theme on screen
  shared/         button, card, dialog and other primitives, hooks, test helpers
  styles/         base.css
```

## ⚠️ Watch out

| Trap | What to do |
|------|------------|
| Apps and other packages cannot import `@allonfire/shadcn` | Add an `AOF…` wrapper here; Biome enforces it |
| A new file is read outside this package | Give it its own `exports` key in `package.json` |
| A component needs a Design's look | Take it as a slot or a prop from the app, never import it |
| A client piece is handed a function or a component by a Server Component | Shared pieces take strings and nodes only; bind the rest in a client file of the app |
| `URL.parse` throws on older phones | Use core's `hostOf`; a test fails on `URL.parse` here |
| A fixed element lands under a notch or the home indicator | Keep it inside the gutters (the safe-area rule in the design system guide) |

## 🧪 Run and test

```bash
pnpm --filter @allonfire/ui test
pnpm --filter @allonfire/ui test:browser          # real Chromium and WebKit
pnpm --filter @allonfire/ui test:browser:headed   # the same, with the windows shown
pnpm --filter @allonfire/ui check-types
```

## 📚 More

- [Design system](../../docs/guides/design-system.md): where a component goes, slots, the table and filter panel, safe areas
- [Forms](../../docs/guides/forms.md)
- [Testing](../../docs/guides/testing.md)
- ADRs: [AOF components on top of shadcn](../../docs/adr/0010-shadcn-generated-aof-components-on-top.md), [the app scaffold lives in packages](../../docs/adr/0033-the-app-scaffold-lives-in-packages.md)

---

<p align="center">
  ⬅️ <a href="../../README.md">Back to monorepo root</a>
</p>
