# Users table: library survey

2026-10-21. The Back Office Users page needs:

- a TanStack Table with server-side pagination (25, 50 or 100 rows per page);
- a search box plus App and Role selects, all held in the URL with nuqs;
- the table filling the height on desktop and a card per User on a phone;
- a row that opens the User.

The survey covered free items only, with every URL answering 200. "Base UI" was read from each item's registry JSON.

## Official shadcn

- **Data Table guide**, https://ui.shadcn.com/docs/components/base/data-table: free, Base UI. TanStack pagination, filtering and column visibility, all on the client. **Idea only**: it is the baseline the rest build on.
- **dashboard-01**, https://ui.shadcn.com/view/new-york-v4/dashboard-01 (base-nova JSON at `/r/styles/base-nova/dashboard-01.json`): needs @dnd-kit and zod, with row dragging, tabs and a drawer on mobile. **Idea only**: far more page than a Users list.
- **Tasks example**, https://ui.shadcn.com/examples/tasks: faceted filters and a toolbar. **Idea only**.

## Shadcn Studio

- **data-table-01 to 13**, preview at https://shadcnstudio.com/preview/components/base/data-table?index=9: free, base-nova JSON, Base UI. Number 10 has pagination, selection and sorting; number 3 has search and column visibility; all on the client. **Idea only**: a reference for the footer's styling.
- The datatable-example blocks are Pro (404 without a key).

## Shadcnblocks

- **data-table1**, https://www.shadcnblocks.com/preview/data-table1: free, a plain sortable table. The blocks with pagination and filters (6, 7, 14) are Pro. **Skip**.

## Shadcn UI Kit

- **data-table1**, https://shadcnuikit.com/components/data-table: free, Radix (`asChild`), on the client. **Skip**.

## Shadcn UI Blocks

- **table-09**, https://shadcnui-blocks.com/components/table: Radix. **Skip**.
- **pagination-14**: a rows-per-page select, a range label and previous and next buttons, with no Radix-only code. **Idea only**.

## React Bits, Ui-Layouts, Aceternity UI

No table, pagination or list items: animated, decorative and marketing pieces only. **Skip**.

## Beyond the list

- **DiceUI data-table** (tablecn), https://tablecn.com and https://diceui.com/docs/components/base/data-table: free, with a real Base UI build (`https://diceui.com/r/base-nova/data-table.json`, `shadcn add @diceui/data-table`).
  - Needs @tanstack/react-table, nuqs, zod, @base-ui/react and @base-ui/utils.
  - Its `useDataTable` hook keeps page, perPage, sort and filters in nuqs URL params, with `manualPagination` and a `pageCount` from the server.
  - It also ships a toolbar, filters, a pagination footer, view options and a skeleton.
  - Page sizes are configurable (`[25, 50, 100]`).
  - **Use**: it matches the stack exactly.
- **@tablecn** (minhduoc-tran), https://table-cn.vercel.app: TanStack Table v9, plus @querycn, dnd-kit and virtualization. **Skip**: too heavy.
- **openstatus data-table-filters**, https://data-table.openstatus.dev/drizzle: free but Radix, 63 files, infinite scroll instead of pages. **Idea only**: how it filters on the server with nuqs.

## Mobile cards

No library has a card per row. They come from the same table instance: `table.getRowModel().rows` drawn as shadcn `card`s below `md`, with the `<Table>` from `md` up.

## Recommendation

DiceUI's Base UI data-table:

1. Installed through the shadcn CLI into `packages/shadcn` and wrapped as AOF components in `packages/ui`.
2. Its URL keys and page sizes set to fit the Users page.
3. Its toolbar carrying the email search and two single-choice selects (App and Role) that write `app:` and `role:` into `search`.
