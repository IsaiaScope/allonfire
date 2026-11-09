// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { computedValue } from "../../../shared/tests/computed-style";
import { AOFDataTable, useAOFTable } from "../components/aof-data-table";
import { boxHeight, DATA_TABLE_BOX, fieldHeight, px } from "./data-table-box";
import { PEOPLE, PEOPLE_COLUMNS } from "./people";

const LABEL = "People";
/** A list's own row height, taller than a field. */
const OWN_ROW = { CLASS: "[--data-table-row:3rem]", VALUE: "3rem" } as const;

const People = ({ className }: { className?: string | undefined }) => {
  const table = useAOFTable({
    columns: PEOPLE_COLUMNS,
    data: PEOPLE,
    getRowId: ({ id }) => id,
  });
  return <AOFDataTable className={className} label={LABEL} table={table} />;
};

/** The table's parts, by the slots it names them with. */
const parts = async (className?: string) => {
  const screen = await render(<People className={className} />);
  const find = (selector: string) => {
    const element = screen.container.querySelector(selector);
    if (!element) {
      throw new Error(`the table drew no ${selector}`);
    }
    return element;
  };
  const viewport = find('[data-slot="data-table-viewport"]');
  return {
    box: viewport.parentElement ?? viewport,
    header: find('[data-slot="table-header"]'),
    row: find('[data-slot="table-body"] [data-slot="table-row"]'),
    rows: find('[data-slot="data-table-rows"]'),
    viewport,
  };
};

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

describe("AOFDataTable scrolling", () => {
  // iOS pans a box that scrolls both ways freely on a diagonal drag.
  it("scrolls sideways outside and up and down inside, one axis each", async () => {
    const { header, rows, viewport } = await parts();
    const outside = getComputedStyle(viewport);
    expect(outside.overflowY).toBe("hidden");
    expect(outside.overflowX).not.toBe("hidden");
    expect(outside.overscrollBehaviorX).toBe("none");
    const inside = getComputedStyle(rows);
    expect(inside.overflowX).toBe("hidden");
    expect(inside.overflowY).not.toBe("hidden");
    expect(inside.overscrollBehaviorY).toBe("auto");
    // The header sticks to the up-and-down box, so it moves sideways with
    // its columns.
    expect(getComputedStyle(header).position).toBe("sticky");
    expect(getComputedStyle(header).top).toBe("0px");
    expect(rows.contains(header)).toBe(true);
  });
});

describe("AOFDataTable height", () => {
  it("keeps a header and eight rows of height, each row a field's height and its line", async () => {
    const { box, row } = await parts();
    expect(box.getBoundingClientRect().height).toBe(boxHeight(fieldHeight()));
    expect(row.getBoundingClientRect().height).toBe(
      fieldHeight() + DATA_TABLE_BOX.LINE_PX
    );
  });

  it("draws each row as tall as the list says", async () => {
    const { box, row } = await parts(OWN_ROW.CLASS);
    const own = px(computedValue("height", OWN_ROW.VALUE));
    expect(row.getBoundingClientRect().height).toBe(own);
    expect(box.getBoundingClientRect().height).toBe(boxHeight(own));
  });
});
