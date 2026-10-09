# Pages are built in their App; the design package holds Designs and prototypes

ADR 0011 put every App page's interface in `packages/design` as a Screen, so
impeccable kept one state folder. In practice a Screen was not a draft: it was
the code the App shipped, living outside the App, taking every string as a
typed `copy` prop and every App element as a slot, because the package could
not import next-intl or `next/*`. Reading one feature meant two packages.

We checked the constraint behind 0011 again (impeccable 4.3.1): given an App
file as its target with `IMPECCABLE_CONTEXT_DIR` set, impeccable still reads
`PRODUCT.md` and `DESIGN.md` from the package and only treats the App as the
project root for state it writes, under `apps/<app>/.impeccable/`, which is
gitignored. So impeccable can work on App code directly.

Pages and their components are now built in their App, under
`apps/<app>/src/features/<topic>/components/`, using next-intl and Next
directly. That includes a Design's signature pieces: the Back office's
departure board, hanko seal and tactile strip live in its `auth` feature. A
second App wanting one moves it to `@allonfire/ui` as an AOF component then.
The design package holds no real component. It keeps the Designs
(`DESIGN.md`, sidecar, `theme.css`, fonts), each App's `PRODUCT.md` and
stylesheet, and impeccable's tracked state. It also holds prototypes: a draft page built in
`src/apps/<app>/prototypes/` to explore a look, which moves into the App once
approved and is then deleted. `aof-design` offers both ways in, prototype and
direct.

This supersedes ADR 0011's "Screens live in the design package". The rest of
0011 stands: a Design is shared through the package, `design:sync` keeps the
App copies in step, and `aof-design` is the only way to run impeccable.

## Considered Options

- **Keep Screens in the package** (0011): one impeccable state folder, but the
  shipped interface sits outside its App and every page pays the `copy` prop
  and slot overhead.
- **Keep a Design's components in the package** (`src/designs/<name>/components/`):
  ready for a second App wearing the Design, but real components outside any
  App again, for an App that does not exist yet.

## Consequences

- The `./apps/<app>/screens/*` export is gone; `./apps/<app>/prototypes/*`
  replaces it, for drafts only.
- An App page can hold its own markup when it is trivial (home, error, not
  found); a page with real interface renders a feature component.
- impeccable's surface briefs for App targets land in the App's gitignored
  `.impeccable/`; only prototypes keep their briefs in the package.
