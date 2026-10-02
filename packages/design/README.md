<h1 align="center">@allonfire/design</h1>

<p align="center">
  <img src="https://img.shields.io/badge/impeccable-4-111111" alt="impeccable" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
</p>

<p align="center">What the Apps share visually: the Designs, each App's product context and stylesheet, prototypes under review, and impeccable's state. No real components.</p>

## What it is

A **Design** is a named visual world that one or more Apps wear (Japan is the
first): its rules, tokens and fonts. A **prototype** is a draft page tried
here with impeccable; once approved it moves into its App and is deleted.
Every real component lives in an App, under `src/features/<topic>/components/`
(the Back office's station pieces sit in `features/auth/components/`), or in
`@allonfire/ui` when it is a generic AOF component. An App imports only its
stylesheet from here. See ADR 0011 and ADR 0014.

Every change goes through `/aof-design`, which runs impeccable against this
package. Plain `/impeccable` finds no product context here on purpose.

## Layout

```
.impeccable/            impeccable state: config.json and surfaces/ are tracked
scripts/sync.ts         design:sync
src/designs/<name>/     DESIGN.md, DESIGN.json, theme.css, fonts/ (the source)
src/apps/<app>/         PRODUCT.md, styles.css, prototypes/ (drafts only),
                        DESIGN.md + DESIGN.json (generated copies)
```

## Exports

| Export | Contents |
|--------|----------|
| `./apps/back-office/styles.css` | ui's base, the worn Design's tokens, `@source` for prototypes |
| `./apps/back-office/prototypes/*` | a draft page while it is under review (none today) |

## design:sync

```bash
pnpm design:sync                 # copy each Design into the Apps wearing it
pnpm design:sync --check         # CI: exit 1 when a copy drifted
pnpm design:sync --from <app>    # copy an App's edited copy back, fan out
```

It also refuses to run while a `PRODUCT.md` or `DESIGN.md` sits at the repo
root, in `docs/`, in `.agents/context/` or at this package's root: impeccable
would read it instead of the App's.

## Tests

```bash
pnpm --filter @allonfire/design test
pnpm --filter @allonfire/design check-types
```
