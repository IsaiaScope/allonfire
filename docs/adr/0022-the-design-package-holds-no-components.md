# The design package holds no components

ADR 0014 left two kinds of React in `packages/design`: the generated-image
templates (the Brand's `BrandLogo`, the Japan Design's `JapanShareCard`) and
page prototypes under review. Both are gone. The package now holds only what
is not code you render: fonts, `theme.css` and each App's stylesheet, the
Designs' Markdown, and constants (the Brand's monogram and logo geometry, a
Design's image colours, image face and card look). Every component lives in
`packages/ui`, so a future App shares it the same way it shares `AOFButton`.

## Decision

- The image templates are AOF components in `packages/ui`:
  `AOFBrandLogo` (`components/aof-brand-logo`) and `AOFShareCard`
  (`components/aof-share-card`). Both stay Satori-friendly (flex, inline
  styles) and never import Next or next-intl.
- `AOFShareCard` belongs to no Design. A Design dresses it with data: the
  Japan Design's `JAPAN_SHARE_CARD` (`designs/japan/share-card-look`) gives,
  per colour scheme, the colours, the image face and the tactile paving
  strip along the bottom edge. The App adds its band (its line), logo,
  headline and description.
- `ui` depends on `design` for those constants; `design` depends only on
  `core`, for generic helpers (`svgDataUrl`).
  An App's `globals.css` imports `@allonfire/ui/styles/base.css` itself,
  then its stylesheet from `design`, which no longer imports ui's base.
- Prototype mode is dropped: `aof-design` builds every page directly in its
  App (`apps/<app>/src/features/<topic>/components/`). The
  `./apps/<app>/prototypes/*` export and the stylesheet's
  `@source "./prototypes"` are gone.

## Why

- A component in `design` was an exception every reader had to learn, and it
  forced the package to carry React, its types and render tests.
- `ui` is already where shared components live and where future Apps look.
- A look expressed as data lets a second Design dress the same card instead
  of copying it.

## Consequences

- `packages/design` has no `.tsx`, no React dependency and no JSX in its
  `tsconfig.json`, which now takes the base config's strict flags whole.
- Trying a look first means building it in the App and reverting it if the
  owner declines; there is no separate draft area.
- Supersedes the parts of ADR 0011 and ADR 0014 that kept Design components
  and prototypes in the package.
