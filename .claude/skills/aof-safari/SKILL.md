---
name: aof-safari
description: >
  Handle iOS Safari's toolbar, status bar, notch, home indicator and viewport units in AllOnFire
  Apps. Use when a page shows a solid band under or over Safari's bars, content is cut at the
  bottom, something goes under the notch or home indicator, or when adding a fixed element,
  a full-height frame, a toast, a dialog scrim or any `vh`/`svh`/`dvh` class.
---

# aof-safari

Read `docs/guides/safari.md` first: it holds what Safari 26 does, the rules
and the sources. Safe-area gutters and their e2e guard: `docs/guides/design-system.md`.

## Before writing

1. Fixed element at the bottom or top edge? Do not add one unless it is content:
   Safari tints and clips its whole bar band from it. Toasts are the exception.
2. A height that fills the screen: `dvh` (`min-h-dvh`, `h-dvh`), never `svh`/`vh`.
3. Text or controls near an edge: use `--gutter-*` (`bottom-(--gutter-bottom)`),
   never a bare `p-*` or `bottom-*`. Backgrounds can run under the insets.
4. The root stays opaque: `html` is `--background` (ui's `base.css`).

## Checking

- Run the App's `e2e/safe-area.spec.ts` (Chromium notch emulation).
- Chromium draws no Safari bars. For anything about a band or the toolbar, ask the
  owner for iPhone screenshots: portrait with toolbar shown, portrait scrolled
  (compact toolbar), landscape both ways, beside a page that behaves (Google).
  Say plainly that the fix is unverified until they have looked.
- Pin the class or the absence of a fixed strip in a unit test.

## After

Add a dated line under `## History and gotchas` in `docs/guides/safari.md` for a
new symptom, its cause and its fix.
