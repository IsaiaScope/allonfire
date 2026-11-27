<h1 align="center">@allonfire/design</h1>

<p align="center">
  <img src="https://img.shields.io/badge/impeccable-4-111111" alt="impeccable" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
</p>

<p align="center">How the apps look, as fonts, CSS, Markdown and constants: the Designs, the Brand and each app's product context. No components.</p>

---

## 🔧 Use it

A **Design** is a named visual world that apps wear: its rules, tokens and fonts.

| I want to | Use |
|-----------|-----|
| change a Design, or add one | `/aof-design`, which runs impeccable against this package |
| style an app with its Design | import its stylesheet after ui's base (below) |
| copy a Design into the apps wearing it | `pnpm design:sync` |
| draw an app's logo | `aofLogoSvg` (`@allonfire/design/brand/aof-logo`) |
| use a Design's colours where CSS variables do not reach | its `image-colors` |
| list how each app is drawn | `APP` (`@allonfire/design/apps/app`) |

An app's whole `globals.css`:

```css
@import "@allonfire/ui/styles/base.css";
@import "@allonfire/design/apps/back-office/styles.css";

@source "../";
```

## 🗂️ Where things are

```
.impeccable/            impeccable's state
scripts/                design:sync
src/
  brand/                the AOF monogram and the logo built around it
  designs/<name>/       DESIGN.md, DESIGN.json, theme.css, fonts, looks for images and email
  designs/shared/       the font file reader and the tests every Design passes
  apps/<app>/           PRODUCT.md, styles.css, the app's logo, copies of its Design
  apps/app.ts           how every app is drawn in a switcher
```

## 🔁 design:sync

From the repo root:

```bash
pnpm design:sync                 # copy each Design into the apps wearing it
pnpm design:sync --check         # write nothing, exit 1 if a copy drifted (the static Stage runs it)
pnpm design:sync --from <app>    # copy an app's edited copy back to its Design, then to every wearer
```

An app wears the Design whose `theme.css` its `src/apps/<app>/styles.css` imports.

## ⚠️ Watch out

| Trap | What to do |
|------|------------|
| `DESIGN.md` and `DESIGN.json` under `src/apps/<app>/` are copies | Edit the ones in `src/designs/<name>/`, or bring your edit back with `--from` |
| A `PRODUCT.md` or `DESIGN.md` at the repo root, in `docs/`, `.agents/context/` or this package's root hides the app's own, and so does `.impeccable/design.json` | `design:sync` refuses to run: move it into the app's folder |
| Plain `/impeccable` finds no product context here, on purpose | Use `/aof-design` |
| `image-fonts` reads font files, so it is server only | A browser bundle takes the face's name from `image-font` |
| The Japan fonts are cut down to listed characters | A new kanji needs a new subset: [fonts README](src/designs/japan/fonts/README.md) |
| Fonts and art carry licences | Record a new one beside it, as in [Ocean's sources](src/designs/ocean/SOURCES.md) |

## 🧪 Run and test

```bash
pnpm --filter @allonfire/design test         # theme contrast, token contract, image colours, logos
pnpm --filter @allonfire/design check-types
```

## 📚 More

- [Design system](../../docs/guides/design-system.md): what belongs here, in `ui` and in an app
- ADRs: [Designs live in the design package](../../docs/adr/0011-designs-and-screens-live-in-the-design-package.md), [pages are built in their app](../../docs/adr/0014-pages-are-built-in-their-app.md), [no components here](../../docs/adr/0022-the-design-package-holds-no-components.md)

---

<p align="center">
  ⬅️ <a href="../../README.md">Back to monorepo root</a>
</p>
