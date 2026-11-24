<h1 align="center">@allonfire/design</h1>

<p align="center">
  <img src="https://img.shields.io/badge/impeccable-4-111111" alt="impeccable" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
</p>

<p align="center">What the Apps share visually, as fonts, CSS, Markdown and constants: the Designs, the Brand, each App's product context and stylesheet, and impeccable's state. No components.</p>

## What it is

A **Design** is a named visual world that one or more Apps wear (Japan is the
Back Office's, Ocean is Laura's): its rules, tokens and fonts. Every component lives in an App, under
`src/features/<topic>/components/`, or in `@allonfire/ui` when Apps share it,
the generated-image ones included (`AOFBrandLogo`, `AOFShareCard`), which
read this package's constants: the Brand's logo geometry and a Design's image
fonts, colours and card look. An App's `globals.css` imports ui's
`base.css`, then its stylesheet from here. This package depends only on `@allonfire/core`.
See ADR 0011, ADR 0014 and ADR 0022.

Every change goes through `/aof-design`, which runs impeccable against this
package. Plain `/impeccable` finds no product context here on purpose.

## Layout

```
.impeccable/            impeccable state: config.json and surfaces/ are tracked
scripts/sync.ts         design:sync
src/brand/              the AOF monogram (BRAND) and every App's logo around it
src/designs/<name>/     DESIGN.md, DESIGN.json, theme.css, fonts/ (the source),
                        image-font(s).ts, image-colors.ts, share-card-look.ts
                        (what generated images read); Ocean also has
                        email-look.ts, mascot-art.ts, card-back.ts,
                        sea-wave.ts, sea-icons.ts and SOURCES.md (credits)
src/designs/shared/     what every Design's tests and loaders share
                        (the contract test, contrast helpers, font reader)
src/apps/<app>/         PRODUCT.md, styles.css, DESIGN.md + DESIGN.json
                        (generated copies)
```

## Exports

| Export | Contents |
|--------|----------|
| `./apps/back-office/styles.css` | the worn Design's tokens and the App's own rules, imported after ui's base |
| `./brand/aof-monogram` | `BRAND`: the brand's name, the monogram as markup, SVG and data URL, its dark ground and letter colour |
| `./brand/aof-logo` | `aofLogoSvg` (an App's logo as SVG: square or horizontal, dark, light or `auto`), `AOF_LOGO` geometry, `AppLogo` |
| `./designs/japan/image-colors` | `JAPAN_IMAGE_COLOR`: the Design's colours for what cannot read CSS variables |
| `./designs/japan/image-font` | `JAPAN_IMAGE_FONT.FAMILY`: the face's name, safe in a browser bundle |
| `./designs/japan/image-fonts` | `loadJapanImageFonts`, the face's files for `ImageResponse` (server only: reads files) |
| `./designs/japan/share-card-look` | `JAPAN_SHARE_CARD`: how ui's `AOFShareCard` looks in Japan, per scheme (colours, face, tactile edge) |
| `./designs/japan/theme.css` | the Design's tokens alone, no App's rules: ui's browser tests wear it over ui's base |
| `./apps/laura/styles.css` | Ocean's tokens and Laura's own rules, imported after ui's base |
| `./designs/ocean/image-colors` | `OCEAN_IMAGE_COLOR`: colours for what cannot read CSS variables, and the logo `BANNER` |
| `./designs/ocean/image-font` | `OCEAN_IMAGE_FONT.FAMILY` (Nunito), safe in a browser bundle |
| `./designs/ocean/image-fonts` | `loadOceanImageFonts`, the static Nunito files for `ImageResponse` (server only) |
| `./designs/ocean/share-card-look` | `OCEAN_SHARE_CARD`: ui's `AOFShareCard` in Ocean, per scheme (colours, face, wave edge) |
| `./designs/ocean/email-look` | `OCEAN_EMAIL_LOOK`: the colours of ui's `AOFEmail` (no flourish) |
| `./designs/ocean/mascot-art` | `OCEAN_ART` (the full-colour and one-colour emoji art as SVG, each with its licence), `OCEAN_MASCOT_POOL` (the six pictures the pages show) |
| `./designs/ocean/sea-emoji` | `OCEAN_SEA_EMOJI`, `OCEAN_EMOJI_SET`: the Noto and Firefox emoji for each thing the app shows (drawn with `filter: var(--emoji-shadow)`) |
| `./designs/ocean/card-back` | `OCEAN_CARD_BACK`: the Memory game's card back, 300 by 400, SVG and data URL |
| `./designs/ocean/sea-wave` | `oceanWavePath`: the sea line as one open path |
| `./designs/ocean/sea-icons` | `OCEAN_SEA_ICON` (crab, jellyfish, lighthouse) and `oceanSeaIconSvg` |
| `./designs/ocean/theme.css` | Ocean's tokens alone, for ui's browser tests |

## design:sync

```bash
pnpm design:sync                 # copy each Design into the Apps wearing it
pnpm design:sync --check         # CI: exit 1 when a copy drifted
pnpm design:sync --from <app>    # copy an App's edited copy back, fan out
```

An App's `DESIGN.json` is written by its first real page's `document` scan
(Laura has none yet).

It also refuses to run while a `PRODUCT.md` or `DESIGN.md` sits at the repo
root, in `docs/`, in `.agents/context/` or at this package's root: impeccable
would read it instead of the App's.

## Tests

```bash
pnpm --filter @allonfire/design test
pnpm --filter @allonfire/design check-types
```
