# A list's Sort and View are params of their own, its date range stays in `search`

ADR 0026 keeps every filter and the free text of a list in one `search`
param. Sort and View are not filters: they change how the rows read, not
which rows there are. They get a param each, `sort` (`sort=created.desc,size.asc`:
a column id and a direction, in order, at most three) and `hide`
(`hide=size,apps`: the columns not shown), written the way tablecn writes
them. A date range is a filter, so it stays in `search` as one more field,
`created:2026-11-26..2026-11-28` (whole days, UTC, both ends included; one day
is `created:2026-11-26`), and ADR 0026's "a field holds several values, any of
which matches" does not apply to it: its two parts are a range, not a choice.
Core's parsers drop an unknown column, direction or date as ever, so an old or
hand-edited link still opens. A change to the search, the range or the sort
goes back to the first page and clears the selection; a change to View does
neither, since the rows are the same.

## Considered Options

- Everything in `search` (`sort:created.desc hide:access`): one parser, but
  the typed search box would carry display state, and the comma already
  means "any of" there.
- One param per filter, as tablecn (`createdAt=2026-11-26,2026-11-28`):
  contradicts ADR 0026, which exists so no list grows a parser per filter.

## Consequences

- Sort is done by the database for plain columns only (Created, Size,
  Access, Email); a column that shows a Role or a set of Apps has no Sort, as
  Prisma orders by neither (Prisma 7 changes nothing here).
- A renamed column id breaks links that name it quietly (it is dropped), so a
  rename keeps the old spelling as an alias, as ADR 0026 says of fields.
