// @module-tag integration
import type {
  ColumnVisibilityState,
  SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AOFDataTable, useAOFTable } from "../components/aof-data-table";
import { column, headerColumns, ITEMS } from "./column-header-fixture";

const MAX_SORTS = 2;

/** What the harness reports out, for a test to read. */
const reported: { sorting: SortingState; visibility: ColumnVisibilityState } = {
  sorting: [],
  visibility: {},
};

const COLUMNS = column.columns(headerColumns());

const Harness = ({ sorting: first = [] }: { sorting?: SortingState }) => {
  const [sorting, setSorting] = useState<SortingState>(first);
  const [columnVisibility, setVisibility] = useState<ColumnVisibilityState>({});
  reported.sorting = sorting;
  reported.visibility = columnVisibility;
  const table = useAOFTable({
    columns: COLUMNS,
    data: ITEMS,
    getRowId: ({ id }) => id,
    maxMultiSortColCount: MAX_SORTS,
    onColumnVisibilityChange: setVisibility,
    onSortingChange: setSorting,
    state: { columnVisibility, sorting },
  });
  return <AOFDataTable label="Items" table={table} />;
};

const open = (name: string) =>
  userEvent.click(page.getByRole("button", { name }));

describe("AOFColumnHeader menu", () => {
  it("offers Asc and Desc for a column that sorts and cannot hide", async () => {
    await render(<Harness />);
    await open("Email");
    await expect
      .element(page.getByRole("menuitemcheckbox", { name: "Asc" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("menuitemcheckbox", { name: "Desc" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("menuitemcheckbox", { name: "Hide" }))
      .not.toBeInTheDocument();
  });

  it("offers Hide alone for a column that hides and cannot sort", async () => {
    await render(<Harness />);
    await open("Apps");
    await expect
      .element(page.getByRole("menuitemcheckbox", { name: "Hide" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("menuitemcheckbox", { name: "Asc" }))
      .not.toBeInTheDocument();
  });

  it("sorts with the keyboard and reports the direction as checked", async () => {
    await render(<Harness />);
    page.getByRole("button", { name: "Size" }).element().focus();
    await userEvent.keyboard("{Enter}");
    // The menu shows before the focus moves in, a frame later: a key pressed
    // in between goes nowhere, so each one waits for the focus it acts on.
    const item = (name: string) => page.getByRole("menuitemcheckbox", { name });
    await expect.element(item("Asc")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect.element(item("Desc")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect
      .poll(() => reported.sorting)
      .toEqual([{ desc: true, id: "size" }]);
    // A checkbox item keeps the menu open: the direction reads as checked in it.
    await expect
      .element(page.getByRole("menuitemcheckbox", { name: "Desc" }))
      .toHaveAttribute("aria-checked", "true");
    await expect
      .element(page.getByRole("menuitemcheckbox", { name: "Asc" }))
      .toHaveAttribute("aria-checked", "false");
  });

  it("clears the sort when the active direction is chosen again", async () => {
    await render(<Harness sorting={[{ desc: true, id: "size" }]} />);
    await open("Size");
    await userEvent.click(page.getByRole("menuitemcheckbox", { name: "Desc" }));
    expect(reported.sorting).toEqual([]);
  });

  it("puts the chosen column first, keeps the others and cuts past the maximum", async () => {
    await render(<Harness sorting={[{ desc: false, id: "size" }]} />);
    await open("Email");
    await userEvent.click(page.getByRole("menuitemcheckbox", { name: "Asc" }));
    expect(reported.sorting).toEqual([
      { desc: false, id: "email" },
      { desc: false, id: "size" },
    ]);
  });

  it("hides the column and its cells", async () => {
    const screen = await render(<Harness />);
    await open("Apps");
    await userEvent.click(page.getByRole("menuitemcheckbox", { name: "Hide" }));
    expect(reported.visibility).toEqual({ apps: false });
    await expect
      .element(page.getByRole("columnheader", { name: "Apps" }))
      .not.toBeInTheDocument();
    expect(screen.container.textContent).not.toContain("laura");
  });
});
