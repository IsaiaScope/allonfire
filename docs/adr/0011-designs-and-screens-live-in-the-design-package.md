# Designs and Screens live in the design package, managed by impeccable

> Partly superseded by ADR 0014: pages and their components are now built in
> their App; the package keeps the Designs, Design components and prototypes.

Every page is designed with impeccable, and a Design (Japan first) is meant to
be worn by more than one App. impeccable v4 keeps its state in `.impeccable/`
at the project root of whatever file it edits, and reads `PRODUCT.md` and
`DESIGN.md` from that root. So the files impeccable edits decide where its state
lands: if it edited App pages, every App would grow its own `.impeccable/`,
`PRODUCT.md` and `DESIGN.md`, and a shared Design would need copies in each.
We made `packages/design` the one place impeccable works. It holds the Designs
(`DESIGN.md`, sidecar, `theme.css`), each App's `PRODUCT.md`, the App's Screens
and impeccable's state. An App imports one stylesheet and its Screens; its
pages only route, fetch and translate. The `aof-design` skill is the only way
in: it points impeccable at the App's context folder inside the package with
`IMPECCABLE_CONTEXT_DIR` and keeps the Design's copies in step with
`design:sync`.

This supersedes ADR 0010's "one Theme per App" in `@allonfire/ui`. The rest of
0010 stands: `@allonfire/ui` still holds the AOF components and is still the
only package that imports `@allonfire/shadcn`.

## Considered Options

- **impeccable files in each App** (its default): no wrapper needed, but every
  App carries impeccable state and a copy of its Design, and a Design change
  must be copied out to each.
- **The App owns its DESIGN.md, the package holds starting templates**: no
  sync, but a change to Japan never reaches the second App.
- **Absorbing `@allonfire/ui` into the design package**: one fewer package, but
  the shadcn import rule would move and AOF components would sit beside
  App-specific Screens.

## Consequences

- impeccable's live mode is the exception: it needs the App's dev server and
  reads `PRODUCT.md`/`DESIGN.md` only upward from the App, so for the length of
  a session the App holds copies of them and `.impeccable/live/`, plus a pointer
  at the repo root. All are gitignored and removed when the session ends.
- Plain `/impeccable` finds no context (neither the App nor the repo root holds
  a `PRODUCT.md`), so work done without `/aof-design` is visibly unbriefed.
- Screens take their copy as typed props; the App translates. The package does
  not depend on next-intl.
- A Design's sidecar lives as `DESIGN.json` beside its `DESIGN.md`, not in
  `.impeccable/design.json` where impeccable 4.3 wants it: that folder is the
  package's, shared by every App, while a sidecar belongs to one Design.
  impeccable reports the App-folder copy as a legacy path; `aof-design` expects
  the finding and moves any sidecar impeccable writes back to the App folder.
