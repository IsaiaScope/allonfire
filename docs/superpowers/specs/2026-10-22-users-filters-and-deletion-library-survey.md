# Users list filters and deletion: library survey

2026-10-22. The Users list needs two more pieces:

- **Filter selects.** App and Role open a searchable list instead of a plain select: a search box, a check beside the chosen option, and a Reset row at the bottom. The owner pointed at DiceUI's look.
- **Deletion.** A checkbox on each row and in the header selects Users, and a bar offers to delete them. An Admin can never delete themselves.

Free items only. Every URL answered 200, and the Base UI builds were read from their registry JSON.

## Already installed (`packages/shadcn`)

- `checkbox`, `alert-dialog`, `command`, `popover`, `combobox` (Base UI's), `cmdk` 1.1.1: every primitive both pieces need.

## Official shadcn

- **Combobox**, https://ui.shadcn.com/docs/components/base/combobox: Base UI, installed. Search, a check per item, `multiple`. It has no footer row for Reset. **Idea only**: the fallback if DiceUI is declined.
- **Tasks example**, https://ui.shadcn.com/examples/tasks: faceted filters (Command plus Popover), row checkboxes, a "Clear filters" row. It is built on Radix and runs everything on the client. **Idea only**.

## DiceUI (the look the owner picked)

- **Faceted**, https://diceui.com/docs/components/base/faceted. JSON at `https://diceui.com/r/base-nova/faceted.json`, 200, Base UI.
  - Depends on `cmdk` (installed) and shadcn's `command` and `popover` (installed).
  - Composable parts: `Faceted`, `FacetedTrigger`, `FacetedValue`, `FacetedContent`, `FacetedInput`, `FacetedList`, `FacetedEmpty`, `FacetedGroup`, `FacetedItem`, `FacetedItemIndicator`, `FacetedSeparator`, `FacetedClear`.
  - Single or multiple choice.
  - Every word is a child or a prop. The one English default, `placeholder = "Select options..."`, can be overridden, so the Italian Back Office can translate it. That is the reason its full data-table was declined.
  - **Use.** It is what the screenshot shows: the Reset row is `FacetedClear` and the checks are `FacetedItemIndicator`.
- **Action Bar**, https://diceui.com/docs/components/base/action-bar. JSON at `https://diceui.com/r/base-nova/action-bar.json`, 200, Base UI.
  - Depends on shadcn's `button` and `direction` (both installed).
  - A floating bar shown while rows are selected: `ActionBarSelection` (the count), `ActionBarGroup`, `ActionBarItem`, `ActionBarSeparator`, `ActionBarClose`.
  - Portalled to the bottom of the page, with keyboard roving between items.
  - Every word is a child.
  - **Use**: "3 selected · Delete · ✕".
- **Data table**, https://tablecn.com: the reference for how faceted filters and the action bar sit with row selection. **Idea only**, since it was declined on 2026-10-21 (its footer cannot be translated).

## Shadcn Studio

- **combobox**, https://shadcnstudio.com/preview/components/base/combobox: free Base UI variants of shadcn's combobox, with no Reset row. **Idea only**.
- **data-table-10**, https://shadcnstudio.com/preview/components/base/data-table?index=10: row selection with a header checkbox, on the client. **Idea only**: how the select-all checkbox shows a partial selection.

## Shadcn UI Kit, Shadcnblocks, Shadcn UI Blocks, React Bits, Ui-Layouts, Aceternity UI

- Shadcn UI Kit's combobox is Radix: **skip**.
- The rest have no faceted filter or selection bar, or have them only as Pro: **skip**.

## Recommendation

Install DiceUI's `faceted` and `action-bar` through the shadcn CLI into `packages/shadcn`, and wrap them as AOF components in `packages/ui`:

- **`AOFFaceted`** for the App and Role filters. They stay single-choice, as ADR 0026 has them, with Reset clearing the filter.
- **`AOFActionBar`** for deletion.
- **Row selection** comes from TanStack Table's `rowSelectionFeature`, with shadcn's `checkbox` in a first column.
- **Confirmation** is shadcn's `alert-dialog`, before anything is deleted.
- **Self-protection:** the signed-in Admin's own row has no checkbox, and the API refuses their id too.
