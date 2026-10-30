# Back Office on a Phone in Landscape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a phone turned sideways the Back Office keeps its wide layout clear of the notch, rounded corners and home indicator, and every data table scrolls one axis at a time without bouncing loose.

**Status:** implemented (uncommitted) @ 2026-10-29T13:39:59Z

**Architecture:** The sidebar grows by `env(safe-area-inset-left)` and pads its own content by it, its colour filling the strip; the frame's footer, header and page gutter take the remaining insets. ui's `AOFDataTable` splits its one two-way scroller into two nested one-axis scrollers (sideways outside, up and down inside, header sticky in the inner one), with a minimum height so a short screen scrolls the page instead.

**Tech Stack:** Next 16, Tailwind v4, shadcn sidebar on Base UI, Base UI `ScrollArea`, Vitest (jsdom string render and browser mode in Chromium + WebKit).

**Spec:** `docs/superpowers/specs/2026-10-28-phone-landscape-design.md`

## Global Constraints

- The wide layout stays from `md` (768px) up; no breakpoint change.
- `packages/shadcn` is never edited by hand; changes go in `packages/ui` or `apps/back-office`.
- Every inset is `env(safe-area-inset-*, 0px)`-safe: with no inset (a desktop, a phone in portrait) every width and padding is exactly today's (sidebar 16rem, rail 3.375rem, drawer 18rem).
- The top inset is untouched from `md`: both headers stay `h-16`, level with each other.
- Table minimum height: header plus eight rows, `calc(var(--field-height)+(var(--data-table-row)+1px)*8+2px)`; `--data-table-row` defaults to `--field-height` on the table and sets each body cell's height; Users sets `3.5rem` (changed 2026-10-29 from three rows, owner's call).
- Sideways box: `overscroll-behavior-x: none`. Up-and-down box: `overscroll-behavior-y: auto` (chains to the page's scroller, `AOFSidebarInset`, at the rows' end).
- Keyboard: each box is a Base UI scroll area, so each is a tab stop only while it overflows, with the focus ring (built: a raw `tabIndex={0}` on a div fails Biome's `noNoninteractiveTabindex`, and one stop chaining arrows was not possible); the table keeps its `aria-label`.
- Classes only through `cn` or `cva`, never a bare string const. No `biome-ignore`.
- No commits: `/iso-write` stops before any commit.

## Review Focus

- A desktop with a mouse (insets 0): sidebar, rail, page gutters and table look exactly as before. Pinned in Task 1 (widths fall back to 16rem / 3.375rem) and Task 2 (existing table tests stay green).
- A phone in portrait: the drawer and the User cards are unchanged; the card list keeps its own scroller. Pinned in Task 2 (cards markup unchanged).
- A row wider than the box (a long email): the header moves sideways exactly with its columns. Pinned in Task 2's browser test.
- A loading, empty or error table: its state still shows inside the box at the minimum height. Pinned in Task 2 (existing state tests green, min height asserted on the box).
- Keyboard: Tab reaches the sideways box while the columns overflow, and the rows' box while the rows overflow. Pinned in Task 2's browser test (WebKit scrolls no focused box by arrow keys, a plain div included, so arrow scrolling is not asserted).

---

### Task 1: Frame clear of the screen's edges at every width

**Files:**
- Modify: `packages/ui/src/components/aof-sidebar.tsx` (`RAIL` at ~251, `AOFSidebarProvider`, `AOFSidebar`)
- Modify: `apps/back-office/src/features/navigation/components/app-frame.tsx` (footer ~84, `AOFSidebarInset` ~95, header ~98)
- Test: `packages/ui/src/components/tests/aof-sidebar.test.tsx`, `apps/back-office/src/features/navigation/components/tests/app-frame.test.tsx`

**Interfaces:**
- Produces: `AOFSidebarProvider` sets `--sidebar-width: calc(16rem + env(safe-area-inset-left, 0px))` and `--sidebar-width-icon: calc(3.375rem + env(safe-area-inset-left, 0px))`; `AOFSidebar` pads its inner `[data-sidebar=sidebar]` element (the one painting `bg-sidebar`) left by `env(safe-area-inset-left, 0px)` from `md`, so the colour fills the strip and the icons and labels move in.

- [x] **Step 1: Write the failing tests**

In `aof-sidebar.test.tsx`, test `"widens the sidebar and its rail by the left inset"`: render `AOFSidebarProvider` to markup and assert it contains `--sidebar-width:calc(16rem + env(safe-area-inset-left, 0px))` and `--sidebar-width-icon:calc(3.375rem + env(safe-area-inset-left, 0px))`. Test `"pads the sidebar's content, not its colour, by the left inset"`: the rendered `AOFSidebar` markup contains the class that pads `[data-sidebar=sidebar]` by `env(safe-area-inset-left,0px)` from `md`.

In `app-frame.test.tsx` (the file's `count(html, …)` string style), test `"keeps the frame clear of the screen's edges at every width"`:
- the footer's class is `pb-[max(--spacing(2),env(safe-area-inset-bottom))]` with no `max-md:` prefix;
- the breadcrumb header's class has `pr-[max(--spacing(4),env(safe-area-inset-right))]`;
- `AOFSidebarInset` carries `md:[--gutter-left:var(--page-gutter)]`.

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/ui exec vitest run src/components/tests/aof-sidebar.test.tsx` and `pnpm --filter @allonfire/back-office exec vitest run src/features/navigation/components/tests/app-frame.test.tsx`
Expected: FAIL on the new assertions.

- [x] **Step 3: Implement**

`aof-sidebar.tsx`: add `--sidebar-width` to `RAIL` and add the inset to both values (shadcn's provider spreads `style` after its defaults). The phone drawer (`AOFSidebarSheet`) sets its own `[--sidebar-width:18rem]`, so it stays 18rem with nothing more. `AOFSidebar`: add the padding class through `cn`. Update the comments that say 3.375rem and 16rem to say "plus the left inset".

`app-frame.tsx`: footer drops `max-md:` from its bottom padding; the header gets the right padding; `AOFSidebarInset` gets `md:[--gutter-left:var(--page-gutter)]` (beside the sidebar the page no longer touches the left edge; `--gutter-right` keeps its inset). Rewrite the comments above the header, footer and inset to say what holds at every width.

- [x] **Step 4: Run them to verify they pass**

Same commands. Expected: PASS, and the rest of both files green.

---

### Task 2: Every data table scrolls one axis per box, never bounces sideways, and keeps a minimum height

**Files:**
- Modify: `packages/ui/src/components/aof-data-table.tsx` (desktop branch ~250-318)
- Test: `packages/ui/src/components/tests/aof-data-table.test.tsx`; Create: `apps/back-office/src/features/users/components/tests/users-table-scroll.browser.test.tsx` (`users-table.browser.test.tsx` holds uncommitted work from another session; leave it alone)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: the desktop table renders `ScrollAreaPrimitive.Root` (min height the eight-row minimum above, still `flex-1`) > `ScrollAreaPrimitive.Viewport` `data-slot="data-table-viewport"` (the sideways box: `overflow-y-hidden!`, since Base UI sets `overflow: scroll` inline; `overscroll-x-none`; focus ring) > `ScrollAreaPrimitive.Content` (`h-full`) > a second `ScrollAreaPrimitive.Root` (`h-full`) > `ScrollAreaPrimitive.Viewport` `data-slot="data-table-rows"` (the up-and-down box: `overflow-x-hidden! overscroll-y-auto`, focus ring) > `Table` (keeps `aria-label`) with its header `sticky top-0`. The horizontal `ScrollBar` stays on the outer Root. The card `<ul>` is unchanged.

- [x] **Step 1: Write the failing tests**

In `aof-data-table.test.tsx`, test `"scrolls sideways outside and up and down inside, one axis each"`: the markup holds an element with `data-slot="data-table-rows"`, `tabindex="0"` and `overflow-y-auto overflow-x-hidden`; the viewport carries `overflow-y-hidden!` and `overscroll-x-none`, and no longer `overscroll-x-contain`; the `<thead>` with `sticky top-0` sits inside `data-table-rows`. Test `"keeps a header and eight rows of height, each row as tall as the list says"`: the table carries `[--data-table-row:var(--field-height)]`, the Root the eight-row minimum, the cells `h-(--data-table-row)`.

In the new `users-table-scroll.browser.test.tsx`, rendering `UsersTable` the way `users-table.browser.test.tsx` does (real layout, Chromium and WebKit), with the page at 926×428 (`page.viewport(926, 428)`) and the handlers' list of Users, inside a box narrower than the columns (wrap the table in a 480px-wide parent; at 600px the columns' minimums, about 558px, still fit):
- `"lets each box move along one axis only"`: the viewport's `scrollWidth` exceeds its `clientWidth`; `getComputedStyle` of the viewport gives `overflowY: "hidden"` and `overscrollBehaviorX: "none"`; of `[data-slot=data-table-rows]` gives `overflowX: "hidden"`, `overflowY: "scroll"` (Base UI's own).
- `"moves the header sideways with its columns"`: set the viewport's `scrollLeft = 80`; the `Email` header cell's and the first row's email cell's `getBoundingClientRect().left` are equal.
- `"reaches the sideways box by keyboard while its columns overflow"`: the viewport's `tabIndex` is `0`, the rows' box's `-1` (the rows fit), and the viewport takes focus.
- `"never shrinks below a header and eight Users rows"`: in a 100px-tall parent, the table box's height is at least its header row's plus 8 times a body row's, both measured.

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/ui exec vitest run src/components/tests/aof-data-table.test.tsx` and `pnpm --filter @allonfire/back-office exec vitest run --config vitest.browser.config.ts src/features/users/components/tests/users-table-scroll.browser.test.tsx`
Expected: FAIL on the new tests.

- [x] **Step 3: Implement the nested scrollers in `aof-data-table.tsx`**

The inner box needs the Root's height: give `Content` `h-full` (Base UI's content is `min-width: fit-content`, so it stays as wide as the columns). Rewrite the block comment above the Root: one box per axis because iOS pans freely on a diagonal drag in a two-way scroller (WebKit 209486) and bounces unless `overscroll-behavior` is `none`; up and down chains to the page at the rows' end; the minimum height lets a short screen scroll the page.

- [x] **Step 4: Run them to verify they pass**

Same commands. Expected: PASS, and every other test in both files green.

---

### Task 3: Checks and the owner's phone

**Files:** none new.

- [x] **Step 1: Format and check the repo**

Run: `npx biome check --write` on the four files changed, then `pnpm check-types`, `pnpm lint`, `pnpm test`, and `pnpm --filter @allonfire/back-office test:browser`.
Expected: all green; `pnpm --filter @allonfire/back-office tailwind:check` green (canonical classes).

- [x] **Step 2: Run the Back Office e2e**

Run: `pnpm --filter @allonfire/back-office test:e2e`
Expected: green on all four projects (`frame.spec.ts` and `users.spec.ts` included). Playwright does not emulate safe-area insets, so no e2e asserts them.

- [ ] **Step 3: Owner checks on the iPhone**

Start `pnpm dev:tailscale`, open the Back Office's tailnet URL on the iPhone 13 Pro Max in landscape, notch left and then right, sidebar folded and open. Expected: rail, footer and torii clear of the notch, corners and home bar, with the sidebar's colour behind the notch. The Users table scrolls up and down and sideways, never diagonally, and leaves no gap at any edge. A swipe past the last row scrolls the page to the pager.

## Implementation Log
- Implemented: 2026-10-29T13:39:59Z
- Workspace: current-branch — feat/users-filters-avatars
- Committed: no — awaiting user review
- Left for the owner: Task 3 Step 3, the check on the iPhone in landscape.
