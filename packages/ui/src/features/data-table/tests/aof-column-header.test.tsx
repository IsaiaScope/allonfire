// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFColumnHeader } from "../components/aof-column-header";
import { useAOFTable } from "../components/aof-data-table";
import { column, headerColumns, ITEMS, LABELS } from "./column-header-fixture";

/** Each column's header as the table draws it, by column id. */
const Headers = () => {
  const table = useAOFTable({
    columns: column.columns([
      ...headerColumns(),
      column.display({
        enableHiding: false,
        enableSorting: false,
        header: (info) => (
          <AOFColumnHeader column={info.column} label="Link" labels={LABELS} />
        ),
        id: "link",
      }),
    ]),
    data: ITEMS,
  });
  return (
    <div>
      {table.getHeaderGroups().flatMap((group) =>
        group.headers.map((header) => (
          <section data-column={header.column.id} key={header.id}>
            <table.FlexRender header={header} />
          </section>
        ))
      )}
    </div>
  );
};

const html = renderToStaticMarkup(<Headers />);
/** What the header of column `id` drew. */
const drawn = (id: string) =>
  html.split("<section").find((part) => part.includes(`data-column="${id}"`)) ??
  "";

describe("AOFColumnHeader", () => {
  it("draws a button for a column that sorts, and for one that only hides", () => {
    expect(drawn("email")).toContain("<button");
    expect(drawn("size")).toContain("<button");
    expect(drawn("apps")).toContain("<button");
  });

  it("draws the label alone for a column that neither sorts nor hides", () => {
    expect(drawn("link")).not.toContain("<button");
    expect(drawn("link")).toContain("Link");
  });

  it("shows an unsorted column with its two-way icon", () => {
    expect(drawn("size")).toContain('data-sort="none"');
  });
});
