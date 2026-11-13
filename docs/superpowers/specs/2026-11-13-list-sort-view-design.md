# Lists: Sort, View and a date range, in one Filter panel — design

Date: 2026-11-13. Status: agreed in chat (iso-plan), plan next.

## Intent

The Users and Images lists can only be read newest first and cannot hide a
column. The visitor wants what tablecn.com gives: sort by several columns,
choose which columns show, and filter by a date range, with a quick Asc /
Desc / Hide menu on each column header. Everything but the header menu lives
in the one Filter button's popup (the **Filter panel**, `CONTEXT.md`), which
must be built so any future list (every possible table) gets it by supplying
column definitions and an API sort, with the two existing lists wired in this
work.

## Goals

- A Filter panel with three tabs: **Filter** (the list's filters, plus a date
  range chip for Created), **Sort** (up to three columns, each Asc/Desc,
  reorderable, `Add sort`, `Reset sorting`), **View** (a checklist of
  columns). One button, one count (filters + sorts + hidden columns), one
  `Reset all`.
- Column header menu (tablecn's): a header that sorts or hides opens a menu
  with Asc, Desc, Hide (checkmarks show the current state); a click on the
  active direction clears it; the sort icon on the header shows the state.
- Date range on Created, as tablecn's chip: calendar range popover, a ⓧ on
  the chip and a `Clear` button reset it.
- URL (ADR 0031): `sort=created.desc,size.asc`, `hide=size,apps`, the range in
  `search` as `created:2026-11-26..2026-11-28` (whole UTC days, inclusive).
- The API sorts and filters; both lists are `manualPagination`, so the browser
  never sorts a page.
- Prisma moves from 6.19 to 7.x first, in the same plan, after an audit of
  its breaking changes against the repo.

## Non-goals and anti-goals

- No sort on a column that shows a Role (Users) or a set of Apps / the alt
  (Images), nor on Dimensions: Prisma orders by none of these, in 6 or in 7,
  and no raw SQL or in-memory path is added. They still hide.
- Not a free-form filter builder (tablecn's advanced filter), no drag
  reorder is required beyond Up/Down controls if drag costs too much
  (builder's call), no keyboard shortcut.
- A phone's cards ignore View; they still sort and filter.
- A column that names a row or opens it can never hide: the first (Image, Email) and the one whose cell is the link to the row (Images' Alt, Users' Created).
- Anti-goal: a sort or range that changes rows while the selection stays
  (the selection resets), or a View change that resets the page.

## Approaches considered

- Popup layout: tabs (**picked**), stacked sections, collapsible sections.
  Tabs keep the panel short; the Sort rows and the date chip never fight for
  height. Mockups were compared in chat.
- Address: split by kind (**picked**), everything in `search`, tablecn's
  one-param-per-filter. ADR 0031.
- Computed sort (pixel area, Role rank, Apps text): hybrid in-memory, TypedSQL,
  Prisma 7 first. Prisma 7's `orderBy` is unchanged; the owner chose **plain
  columns only** and the Prisma 7 upgrade as its own first phase.
- Date range days: whole UTC days (**picked**) over the visitor's zone: a link
  selects the same rows for every Admin.

## Decided

- Sortable: Images Created, Size, Access; Users Email, Created. Multi-sort,
  at most three, the header menu puts its column first and keeps the rest;
  `id` is always the last tiebreak; no `sort` means newest first (Created
  desc, `id` desc), as today.
- Hideable: every column but those. Images: Name, Dimensions, Size, Access,
  Apps, Created. Users: each App's Role column.
- Range on Created for both lists.
- A change to search, range or sort writes page 1 and clears the selection;
  View does neither.
- Words: `CONTEXT.md` gains **Filter panel**, **Sort**, **View**.

## Builder's calls (mine, not confirmed by the owner)

- Where the pieces live: ui gets `AOFFilterPanel` with tabs, `AOFSortPanel`,
  `AOFViewPanel`, `AOFDateRangeFilter`, `AOFDataTableColumnHeader`
  (shadcn `popover`, `dropdown-menu`, `calendar` through AOF wrappers; the
  CLI writes `packages/shadcn`); core gets the `sort`/`hide`/range parsers
  and `sortQuery` (like `searchQuery`); the lists supply a column table.
- Sort rows reorder with Up/Down buttons, not drag, to stay keyboard
  reachable (drag is a later nicety).
- Prisma 7 target: the latest 7.x patch at plan time, with `@prisma/adapter-pg`.
  The pool keeps v6's 5 s connect timeout explicitly.
- The date column's id is `created` in both lists (today `createdAt`), so the
  grammar and the column agree; Users' App columns keep the `App` values as
  ids (`hide=LAURA`).
- The page numbers and cache keys carry `sort`, `hide` is client-only (View
  needs no refetch, so it is not part of `QUERY.X.LIST`).

## Data checklist (`next-apps.md`)

Both lists' pages already hydrate through the private cache, read back by
`useQuery` (the key gains `sort` and the range through `search`; `hide` stays
out of the key). No new write: every point holds as for the lists today
(resource protection: the page and the API gate as before; resource changed
and lost and gone: unchanged, the lists save nothing).
