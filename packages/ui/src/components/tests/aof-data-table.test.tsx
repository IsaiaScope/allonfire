// @module-tag unit
import type { RowSelectionState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOFDataTable,
  type AOFDataTableStatus,
  type AOFTable,
  aofColumnHelper,
  useAOFTable,
} from "../aof-data-table";
import {
  type AOFDataTableLabels,
  AOFDataTablePagination,
} from "../aof-data-table-pagination";
import { aofSelectColumn } from "../aof-data-table-select";

type Person = { id: string; name: string; role: string };

const PEOPLE: Person[] = [
  { id: "1", name: "Ada", role: "Admin" },
  { id: "2", name: "Grace", role: "User" },
];
const helper = aofColumnHelper<Person>();
const COLUMNS = helper.columns([
  helper.accessor("name", { header: "Name" }),
  helper.accessor("role", { header: "Role" }),
]);
const PAGE_SIZES = [25, 50, 100] as const;
const LABELS: AOFDataTableLabels = {
  first: "Go to first page",
  last: "Go to last page",
  next: "Go to next page",
  page: (page, pageCount) => `Page ${page} of ${pageCount}`,
  previous: "Go to previous page",
  rowsPerPage: "Rows per page",
};

const NOBODY: Person[] = [];

const People = ({
  loading,
  pageIndex,
  people = PEOPLE,
  status,
  withCards = false,
}: {
  loading?: ReactNode;
  pageIndex: number;
  people?: Person[];
  status?: AOFDataTableStatus;
  withCards?: boolean;
}) => {
  const table = useAOFTable({
    columns: COLUMNS,
    data: people,
    getRowId: ({ id }) => id,
    manualPagination: true,
    pageCount: 3,
    state: { pagination: { pageIndex, pageSize: 25 } },
  });
  return (
    <AOFDataTable
      card={withCards ? (row) => <p>card {row.original.name}</p> : undefined}
      footer={
        <AOFDataTablePagination
          labels={LABELS}
          pageSizes={PAGE_SIZES}
          table={table}
        />
      }
      label="People"
      states={{
        empty: <p>Nobody here</p>,
        error: <p>Could not load</p>,
        loading,
      }}
      status={status}
      table={table}
    >
      <p>toolbar</p>
    </AOFDataTable>
  );
};

const DISABLED = / disabled=""/;
/** The header's checkbox, marked mixed, its attributes in either order. */
const MIXED_SELECT_ALL =
  /aria-checked="mixed"[^>]*aria-label="Select every Person"|aria-label="Select every Person"[^>]*aria-checked="mixed"/;

/** Whether the `<button>` carrying `label` has the `disabled` attribute. */
const isDisabled = (html: string, label: string) =>
  DISABLED.test(
    html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0] ?? ""
  );

describe("AOFDataTable", () => {
  it("draws the headers and cells under the table's label", () => {
    const html = renderToStaticMarkup(<People pageIndex={0} />);
    expect(html).toContain('aria-label="People"');
    expect(html).toContain("<th");
    expect(html).toContain("Name");
    expect(html).toContain("Grace");
  });

  it("names the page it is on and the page count", () => {
    expect(renderToStaticMarkup(<People pageIndex={1} />)).toContain(
      "Page 2 of 3"
    );
  });

  it("labels every page button and disables the way back on the first page", () => {
    const first = renderToStaticMarkup(<People pageIndex={0} />);
    expect(isDisabled(first, LABELS.first)).toBe(true);
    expect(isDisabled(first, LABELS.previous)).toBe(true);
    expect(isDisabled(first, LABELS.next)).toBe(false);
    const middle = renderToStaticMarkup(<People pageIndex={1} />);
    expect(isDisabled(middle, LABELS.first)).toBe(false);
    expect(isDisabled(middle, LABELS.last)).toBe(false);
  });

  it("shows the page size and its label", () => {
    const html = renderToStaticMarkup(<People pageIndex={0} />);
    expect(html).toContain(LABELS.rowsPerPage);
    expect(html).toContain(">25<");
  });

  it("draws a card per row for phones when given one", () => {
    const html = renderToStaticMarkup(<People pageIndex={0} withCards />);
    expect(html).toContain("card Ada");
    expect(html).toContain("card Grace");
  });

  it("past the last page, every way back stays open", () => {
    const html = renderToStaticMarkup(<People pageIndex={4} people={NOBODY} />);
    expect(html).toContain("Page 5 of 3");
    expect(isDisabled(html, LABELS.previous)).toBe(false);
    expect(isDisabled(html, LABELS.last)).toBe(false);
    expect(isDisabled(html, LABELS.next)).toBe(true);
  });

  it("shows its empty state instead of rows, keeping the footer", () => {
    const html = renderToStaticMarkup(
      <People pageIndex={2} people={NOBODY} withCards />
    );
    expect(html).toContain("Nobody here");
    expect(html).not.toContain("<table");
    expect(isDisabled(html, LABELS.first)).toBe(false);
  });

  it("keeps the table when there are rows", () => {
    expect(renderToStaticMarkup(<People pageIndex={0} />)).not.toContain(
      "Nobody here"
    );
  });
});

describe("AOFDataTable status", () => {
  it("while pending, draws the skeleton under the toolbar, one column per column", () => {
    const html = renderToStaticMarkup(
      <People pageIndex={0} people={NOBODY} status="pending" />
    );
    expect(html).toContain("toolbar");
    expect(html).toContain('role="status"');
    expect(html.match(/data-skeleton="cell"/g)?.length).toBe(
      COLUMNS.length * 10
    );
    expect(html).not.toContain("<table");
    expect(html).not.toContain("Nobody here");
    expect(html).not.toContain(LABELS.rowsPerPage);
  });

  it("draws a given loading state instead of the skeleton", () => {
    const html = renderToStaticMarkup(
      <People
        loading={<p>Fetching People</p>}
        pageIndex={0}
        people={NOBODY}
        status="pending"
      />
    );
    expect(html).toContain("Fetching People");
    expect(html).not.toContain('data-slot="skeleton"');
  });

  it("on an error with no rows, draws the error under the toolbar", () => {
    const html = renderToStaticMarkup(
      <People pageIndex={0} people={NOBODY} status="error" />
    );
    expect(html).toContain("toolbar");
    expect(html).toContain("Could not load");
    expect(html).not.toContain("Nobody here");
    expect(html).not.toContain(LABELS.rowsPerPage);
  });

  it("on an error with rows still held, keeps showing them", () => {
    const html = renderToStaticMarkup(<People pageIndex={0} status="error" />);
    expect(html).toContain("Grace");
    expect(html).not.toContain("Could not load");
  });
});

describe("aofSelectColumn", () => {
  const SELECT_LABELS = {
    all: "Select every Person",
    row: (row: { original: Person }) => `Select ${row.original.name}`,
  };
  const THREE: Person[] = [...PEOPLE, { id: "3", name: "Linus", role: "User" }];
  // The table the last render built, so a test can act on it.
  let built: AOFTable<Person> | undefined;

  // What the last selection change asked for.
  let asked: RowSelectionState = {};

  const Selectable = ({ selected = {} }: { selected?: RowSelectionState }) => {
    const table = useAOFTable({
      columns: [aofSelectColumn<Person>(SELECT_LABELS), ...COLUMNS],
      data: THREE,
      enableRowSelection: (row) => row.original.id !== "1",
      getRowId: ({ id }) => id,
      onRowSelectionChange: (updater) => {
        asked = typeof updater === "function" ? updater(selected) : updater;
      },
      state: { rowSelection: selected },
    });
    built = table;
    return <AOFDataTable label="People" table={table} />;
  };

  it("draws a checkbox per selectable row and none for a row that cannot be selected", () => {
    const html = renderToStaticMarkup(<Selectable />);
    expect(html).toContain('aria-label="Select Grace"');
    expect(html).toContain('aria-label="Select Linus"');
    expect(html).not.toContain('aria-label="Select Ada"');
    expect(html).toContain('aria-label="Select every Person"');
  });

  it("the header checkbox is indeterminate when some rows are selected", () => {
    const html = renderToStaticMarkup(<Selectable selected={{ "2": true }} />);
    expect(html).toMatch(MIXED_SELECT_ALL);
  });

  it("selecting every page row leaves out a row that cannot be selected", () => {
    renderToStaticMarkup(<Selectable />);
    built?.toggleAllPageRowsSelected(true);
    expect(asked).toEqual({ "2": true, "3": true });
  });
});

const HUGGING_HEAD = /<th[^>]*w-px/;
const HUGGING_HEAD_ALL = /<th[^>]*w-px/g;

const SIZED = helper.columns([
  helper.accessor("name", { header: "Name", maxSize: 300 }),
  helper.accessor("role", { header: "Role", maxSize: 90, minSize: 90 }),
]);

const Sized = ({ fill }: { fill?: readonly string[] }) => {
  const table = useAOFTable({
    columns: SIZED,
    data: PEOPLE,
    getRowId: ({ id }) => id,
  });
  return <AOFDataTable fill={fill} label="People" table={table} />;
};

describe("AOFDataTable columns", () => {
  it("draws each value as wide as it is, up to its column's max width", () => {
    const html = renderToStaticMarkup(<Sized />);
    expect(html).toContain("max-width:300px");
    expect(html).toContain("truncate");
  });

  it("keeps a column at least its min width; the same min and max fix it", () => {
    expect(renderToStaticMarkup(<Sized />)).toContain(
      "max-width:90px;min-width:90px"
    );
  });

  it("lets the fill columns share the room left over, the rest hugging", () => {
    expect(renderToStaticMarkup(<Sized />)).not.toMatch(HUGGING_HEAD);
    const html = renderToStaticMarkup(<Sized fill={["name"]} />);
    expect(html).toContain("min-width:min-content;width:100%");
    expect(html.match(HUGGING_HEAD_ALL)).toHaveLength(1);
  });
});
