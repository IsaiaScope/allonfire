# Back Office on a phone in landscape

## Intent

On an iPhone 13 Pro Max turned sideways (926×428 CSS px) the Back Office
gets its wide layout, since it is wider than shadcn's 768px phone cutoff. Two
things go wrong there:

1. The frame runs under the notch, the rounded corners and the home
   indicator: the sidebar's rail, its account footer and the header's torii
   avatar are cut off. The page itself already keeps to `--gutter-*`.
2. The Users table can be grabbed and dragged diagonally, header and rows
   together, and pulled past its edges, leaving empty gaps above the header
   and left of the checkboxes (screenshots 2026-10-28 17.23 and 17.27).

The owner wants the wide layout kept, the table to scroll and never drag
loose, and the frame clear of the screen's edges.

## Goals

- **Frame clear of the screen's edges at every width.** The sidebar (the
  folded icon rail and the open sidebar) starts past
  `env(safe-area-inset-left)`; its footer ends above
  `env(safe-area-inset-bottom)`; the breadcrumb header's right end (the torii avatar) ends before
  `env(safe-area-inset-right)`. Today these hold only below `md`
  (`max-md:` in `app-frame.tsx`). It must hold with the notch on either side
  (the phone can be turned both ways).
- **The table scrolls, never drags.** Sideways scrolling stays when the
  columns are wider than the box (the owner likes the table's widths). A
  diagonal drag never moves it both ways at once. Nothing bounces past an
  edge: no gap above the header or beside the first column.
- **A minimum table height.** On a short screen the table box never shrinks
  below its header plus three rows; below that the page scrolls as a whole,
  as Add User's page does.

## Non-goals

- No change to the phone layout below `md` (drawer and User cards).
- No switch to cards or hidden columns when the page area is narrow.
- No change to the breakpoint: landscape on a phone stays the wide layout.

## Anti-goals

- JavaScript that watches touches to lock an axis.
- A table that never scrolls sideways (the owner rejected it).
- A header that drifts away from its columns sideways.

## Constraints and findings

- iOS Safari locks a scroll to one axis only when the gesture starts
  straight; a diagonal start pans freely, and no CSS turns that off
  (Apple's `directionalLockEnabled` is native-only;
  https://developer.apple.com/forums/thread/43390,
  https://bugs.webkit.org/show_bug.cgi?id=209486). The table today is one
  Base UI scroll-area viewport that scrolls both ways
  (`packages/ui/src/components/aof-data-table.tsx`), so it pans freely.
- `overscroll-behavior: none` stops the rubber-band inside the box itself;
  the table has `overscroll-x-contain`, which keeps the bounce
  (https://developer.chrome.com/blog/overscroll-behavior).
- A sticky header inside an iOS scroll container has had positioning bugs
  (https://bugs.webkit.org/show_bug.cgi?id=231953).
- `AOFSidebarInset` is `md:h-svh md:overflow-y-auto`: on desktop the inset is
  the page's scroller, so a table with a minimum height overflows into it and
  the page scrolls.
- The viewport already sets `viewport-fit=cover` (`AOFBaseViewport`), so the
  insets are reported.
- `packages/shadcn` is never edited by hand; changes go in `packages/ui`
  (`aof-sidebar`, `aof-data-table`) or the App.

## Decided

- Keep the wide layout in landscape (owner).
- Sideways scrolling stays; diagonal panning and the bounce go (owner).
- Minimum table height, page scrolls below it (owner).
- **The table becomes two nested scrollers, one axis each** (my call,
  approved by the owner): an outer box that scrolls only sideways and holds
  the columns' full width, with the horizontal bar drawn under it; inside it,
  a box that scrolls only up and down, its header sticky at its top. Each can
  move along one axis only, so a diagonal drag moves one, never both; the
  header scrolls sideways with its columns. The sideways box is
  `overscroll-behavior-x: none`: no bounce, no gap beside the first column.
- **At the rows' end a vertical swipe carries on to the page** (owner): the
  up-and-down box chains to the page's scroller (`overscroll-behavior-y:
  auto`), so a finger on the table reaches the pager. The page may give its
  own bounce at its ends, as any page does; the table's header never parts
  from its rows.
- **Minimum height: header plus three rows** (my call): four
  `--field-height` rows plus the rows' borders.
- **No doubled inset beside the sidebar** (my call): from `md` the sidebar
  covers the left edge, so the frame sets the page's `--gutter-left` to
  `--page-gutter` alone; `--gutter-right` keeps the inset (the notch can be
  on the right). Set in the Back Office's frame, not in ui's tokens. The
  breadcrumb header's right end pads `px-4` plus
  `env(safe-area-inset-right)`.
- **One keyboard stop** (my call): the up-and-down box is focusable, with
  the focus ring and `aria-label`; left and right arrows chain to the
  sideways box. A WebKit browser test proves the arrows move both.

- **Every table** (owner): the two scrollers, the bounce rule and the
  minimum height live in ui's `AOFDataTable`, so every list built on it
  (Users now, Storage later) behaves the same.
- **The sidebar's background runs to the edge** (owner): its colour fills
  behind the notch and only its contents move in by the inset, as iOS apps
  do; the folded rail grows by the inset's width.

No ADR: a one-axis-per-box table is easy to undo, and its reason belongs in
a comment beside it. No new domain term for `CONTEXT.md`.

## Left to the builder

- How the two scrollers sit with Base UI's scroll area (keep it for the drawn
  horizontal bar, or draw the bar another way), as long as the drawn bar,
  keyboard focus ring and `aria-label` survive.
- Where the inset padding lives (`AOFSidebar` in ui, or the App's
  `app-frame.tsx`), and how the folded rail's width grows by the inset.
- Tests: unit tests on classes where behaviour cannot run in jsdom; a browser
  test (WebKit) that the table's viewport scrolls one axis per box; an e2e
  `mobile-safari` landscape check that the sidebar footer and table sit
  inside the safe area, if Playwright's device emulation reports insets (it
  may not; then say so and rely on the owner's phone).
- Verify on the owner's phone through the tailnet dev URL.
