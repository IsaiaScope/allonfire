// @module-tag integration

import { SCREEN } from "@allonfire/core/shared/constants/screens";
import type { SortingState } from "@tanstack/react-table";
import { type ReactNode, useState } from "react";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AOFFilterPanel } from "../components/aof-filter-panel";
import { AOFSortPanel } from "../components/aof-sort-panel";
import { AOFViewPanel } from "../components/aof-view-panel";

const COLUMNS = [
  { id: "created", label: "Created" },
  { id: "size", label: "Size" },
  { id: "access", label: "Access" },
];
const SORT_LABELS = {
  add: "Add sort",
  asc: "Asc",
  column: "Column",
  desc: "Desc",
  direction: "Direction",
  drag: "Drag to reorder",
  remove: "Remove sort",
};
const VIEW_LABELS = {
  clear: "Clear the search",
  empty: "No column",
  search: "Columns",
};
const TAB_LABELS = { filter: "Filter", sort: "Sort", view: "View" };
const MAX_SORTS = 3;
/** The phone width the plan names: a panel and its sort rows must fit it. */
const NARROW = { HEIGHT: 800, WIDTH: 360 } as const;
const PANEL_MAX_REM = 26;
/** A field's height under a mouse, when the page sets no `--field-height`. */
const FIELD_HEIGHT_PX = 40;
const PX_PER_REM = 16;
/** The gap between a sort row's controls on a phone: 6px, a little under a desktop's 8. */
const SORT_GAP_PX = 6;

/** What the harness reports out, for a test to read. */
const reported: { hidden: string[]; sorting: SortingState } = {
  hidden: [],
  sorting: [],
};

const Panel = ({
  decoration,
  hiddenAtStart = [],
  viewFromMd,
}: {
  decoration?: ReactNode;
  hiddenAtStart?: string[];
  viewFromMd?: boolean;
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [hidden, setHidden] = useState<string[]>(hiddenAtStart);
  reported.sorting = sorting;
  reported.hidden = hidden;
  return (
    <AOFFilterPanel
      action={<button type="button">Reset all</button>}
      count={1}
      counts={{ sort: sorting.length, view: hidden.length }}
      decoration={decoration}
      label="Filters"
      sort={
        <AOFSortPanel
          columns={COLUMNS}
          labels={SORT_LABELS}
          max={MAX_SORTS}
          onSortingChange={setSorting}
          sorting={sorting}
        />
      }
      tabActions={{
        filter: <button type="button">Clear filters</button>,
        sort: <button type="button">Reset sorting</button>,
        view: <button type="button">Show all</button>,
      }}
      tabLabels={TAB_LABELS}
      view={
        <AOFViewPanel
          columns={COLUMNS}
          hidden={hidden}
          labels={VIEW_LABELS}
          onHiddenChange={setHidden}
        />
      }
      viewFromMd={viewFromMd}
    >
      <p>the filters</p>
    </AOFFilterPanel>
  );
};

/** Opens the Sort tab and adds a sort twice. */
const addTwoSorts = async () => {
  await userEvent.click(page.getByRole("tab", { name: TAB_LABELS.sort }));
  await userEvent.click(page.getByRole("button", { name: "Add sort" }));
  await userEvent.click(page.getByRole("button", { name: "Add sort" }));
};

const FILTERS_BUTTON = /^Filters/;
/** The harness holds one filter value and one hidden column. */
const FILTERS_ON_PHONE = /^Filters\s*1$/;
const FILTERS_FROM_MD = /^Filters\s*2$/;
const openPanel = () =>
  userEvent.click(page.getByRole("button", { name: FILTERS_BUTTON }));

describe("AOFFilterPanel tabs", () => {
  beforeEach(() => page.viewport(NARROW.WIDTH, NARROW.HEIGHT));

  it("draws Filter, Sort and View tabs, and Reset all under every one", async () => {
    await render(<Panel />);
    await openPanel();
    await expect.element(page.getByRole("tablist")).toBeVisible();
    await expect
      .element(page.getByRole("tab", { name: TAB_LABELS.filter }))
      .toBeVisible();
    await expect
      .element(page.getByRole("tab", { name: TAB_LABELS.sort }))
      .toBeVisible();
    await expect
      .element(page.getByRole("tab", { name: TAB_LABELS.view }))
      .toBeVisible();
    await expect.element(page.getByText("the filters")).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Reset all" }))
      .toBeVisible();
    await userEvent.click(page.getByRole("tab", { name: TAB_LABELS.sort }));
    await expect
      .element(page.getByRole("button", { name: "Reset all" }))
      .toBeVisible();
    await userEvent.click(page.getByRole("tab", { name: TAB_LABELS.view }));
    await expect
      .element(page.getByRole("button", { name: "Reset all" }))
      .toBeVisible();
  });

  it("draws the open tab's own action at the bottom right, Reset all at the left", async () => {
    await render(<Panel />);
    await openPanel();
    const all = page.getByRole("button", { name: "Reset all" });
    await expect
      .element(page.getByRole("button", { name: "Clear filters" }))
      .toBeVisible();
    await userEvent.click(page.getByRole("tab", { name: TAB_LABELS.sort }));
    const own = page.getByRole("button", { name: "Reset sorting" });
    await expect.element(own).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Clear filters" }))
      .not.toBeInTheDocument();
    expect(all.element().getBoundingClientRect().left).toBeLessThan(
      own.element().getBoundingClientRect().left
    );
  });

  it("moves between the tabs with the arrow keys", async () => {
    await render(<Panel />);
    await openPanel();
    page.getByRole("tab", { name: TAB_LABELS.filter }).element().focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect
      .element(page.getByRole("tab", { name: TAB_LABELS.sort }))
      .toHaveFocus();
    // The arrow opens the tab it lands on: no Enter needed.
    await expect
      .element(page.getByRole("tab", { name: TAB_LABELS.sort }))
      .toHaveAttribute("aria-selected", "true");
    await expect
      .element(page.getByRole("tablist", { name: "Filters" }))
      .toBeVisible();
  });

  it("fits the screen: min(100vw - gutters, 26rem), and its sort rows without sideways overflow", async () => {
    await render(<Panel />);
    await openPanel();
    await addTwoSorts();
    const popup = page.getByRole("dialog").element();
    const box = popup.getBoundingClientRect();
    expect(box.width).toBeLessThanOrEqual(PANEL_MAX_REM * PX_PER_REM);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(window.innerWidth);
    expect(popup.scrollWidth).toBeLessThanOrEqual(popup.clientWidth);
  });
});

describe("AOFFilterPanel sort and view", () => {
  beforeEach(() => page.viewport(NARROW.WIDTH, NARROW.HEIGHT));

  it("adds, reorders, removes and resets sorts, and counts them on the tab", async () => {
    await render(<Panel />);
    await openPanel();
    await addTwoSorts();
    expect(reported.sorting).toEqual([
      { desc: false, id: "created" },
      { desc: false, id: "size" },
    ]);
    // dnd-kit's keyboard drag: Space lifts, an arrow moves, Space drops.
    page
      .getByRole("button", { name: "Drag to reorder" })
      .first()
      .element()
      .focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard(" ");
    await expect
      .poll(() => reported.sorting.map(({ id }) => id))
      .toEqual(["size", "created"]);
    await userEvent.click(
      page.getByRole("button", { name: "Remove sort" }).first()
    );
    expect(reported.sorting.map(({ id }) => id)).toEqual(["created"]);
  });

  it("draws a sort's options as tall as a field, like the Faceted rows", async () => {
    await render(<Panel />);
    await openPanel();
    await userEvent.click(page.getByRole("tab", { name: TAB_LABELS.sort }));
    await userEvent.click(page.getByRole("button", { name: "Add sort" }));
    await userEvent.click(page.getByRole("combobox", { name: "Column" }));
    const option = page.getByRole("option", { name: "Size" }).element();
    const field = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--field-height"
      )
    );
    expect(option.getBoundingClientRect().height).toBeGreaterThanOrEqual(
      Number.isNaN(field) ? FIELD_HEIGHT_PX : field
    );
  });

  it("hides a column by choosing its row, and shows them all again", async () => {
    await render(<Panel />);
    await openPanel();
    await userEvent.click(page.getByRole("tab", { name: TAB_LABELS.view }));
    await userEvent.click(page.getByRole("option", { name: "Size" }));
    expect(reported.hidden).toEqual(["size"]);
  });

  it("searches the columns", async () => {
    await render(<Panel />);
    await openPanel();
    await userEvent.click(page.getByRole("tab", { name: TAB_LABELS.view }));
    await userEvent.fill(
      page.getByRole("combobox", { name: "Columns" }),
      "acc"
    );
    await expect
      .element(page.getByRole("option", { name: "Access" }))
      .toBeVisible();
    await expect
      .element(page.getByRole("option", { name: "Size" }))
      .not.toBeInTheDocument();
  });
});

/** A screen far shorter than the panel's tallest tab: a phone turned sideways with a bar or a keyboard up. */
const SHORT = { HEIGHT: 240, WIDTH: 926 } as const;

describe("AOFFilterPanel on a tall screen", () => {
  beforeEach(() => page.viewport(NARROW.WIDTH, NARROW.HEIGHT));

  it("does not scroll when its content fits, whatever its decoration overflows", async () => {
    await render(
      <Panel
        decoration={
          <span
            aria-hidden
            style={{
              height: 2000,
              left: 0,
              position: "absolute",
              top: 0,
              width: 2000,
            }}
          />
        }
      />
    );
    await openPanel();
    const panel = page.getByRole("dialog").element();
    await expect.element(page.getByText("the filters")).toBeVisible();
    expect(panel.scrollHeight).toBeLessThanOrEqual(panel.clientHeight);
    expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth);
  });
});

describe("AOFFilterPanel on a short screen", () => {
  beforeEach(() => page.viewport(SHORT.WIDTH, SHORT.HEIGHT));

  it("stays inside the screen and scrolls as a whole, footer included", async () => {
    await render(<Panel />);
    await openPanel();
    await userEvent.click(page.getByRole("tab", { name: TAB_LABELS.view }));
    const panel = page.getByRole("dialog").element();
    await expect
      .poll(() => panel.getBoundingClientRect().bottom)
      .toBeLessThanOrEqual(window.innerHeight);
    expect(panel.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
    expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
    expect(getComputedStyle(panel).overflowY).toBe("auto");
    // The footer is out of sight until the panel is scrolled to its end.
    panel.scrollTop = panel.scrollHeight;
    const footer = page
      .getByRole("button", { name: "Reset all" })
      .element()
      .getBoundingClientRect();
    expect(footer.bottom).toBeLessThanOrEqual(window.innerHeight);
  });
});

describe("AOFFilterPanel on a phone", () => {
  beforeEach(() => page.viewport(NARROW.WIDTH, NARROW.HEIGHT));

  it("keeps a sort row on one line: column, direction, remove and the handle side by side", async () => {
    await render(<Panel />);
    await openPanel();
    await addTwoSorts();
    const tops = [
      page.getByRole("combobox", { name: "Column" }).first(),
      page.getByRole("combobox", { name: "Direction" }).first(),
      page.getByRole("button", { name: "Remove sort" }).first(),
      page.getByRole("button", { name: "Drag to reorder" }).first(),
    ].map((control) =>
      Math.round(control.element().getBoundingClientRect().top)
    );
    expect(new Set(tops).size).toBe(1);
  });

  it("draws the column and direction selects as wide as each other, with a tight gap on a phone", async () => {
    await render(<Panel />);
    await openPanel();
    await addTwoSorts();
    const column = page
      .getByRole("combobox", { name: "Column" })
      .first()
      .element()
      .getBoundingClientRect();
    const direction = page
      .getByRole("combobox", { name: "Direction" })
      .first()
      .element()
      .getBoundingClientRect();
    expect(Math.abs(column.width - direction.width)).toBeLessThan(1);
    expect(direction.left - column.right).toBeLessThanOrEqual(SORT_GAP_PX);
  });

  it("leaves the View tab out when the table is cards (viewFromMd), and out of the count", async () => {
    await render(<Panel hiddenAtStart={["size"]} viewFromMd />);
    await expect
      .element(page.getByRole("button", { name: FILTERS_ON_PHONE }))
      .toBeVisible();
    await openPanel();
    await expect.element(page.getByRole("tablist")).toBeVisible();
    await expect
      .element(page.getByRole("tab", { name: TAB_LABELS.view }))
      .not.toBeInTheDocument();
  });

  it("keeps the View tab from md, counted", async () => {
    await page.viewport(SCREEN.BREAKPOINT.MD, NARROW.HEIGHT);
    await render(<Panel hiddenAtStart={["size"]} viewFromMd />);
    await expect
      .element(page.getByRole("button", { name: FILTERS_FROM_MD }))
      .toBeVisible();
    await openPanel();
    await expect
      .element(page.getByRole("tab", { name: TAB_LABELS.view }))
      .toBeVisible();
  });
});
