// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFDataTableSkeleton } from "../aof-data-table-skeleton";

const count = (html: string, pattern: RegExp) => html.match(pattern)?.length;
const CELL = /data-skeleton="cell"/g;
const HEAD = /data-skeleton="head"/g;
const CHECK = /data-skeleton="check"/g;

describe("AOFDataTableSkeleton", () => {
  it("draws a header and rows times columns of cells and says it is loading", () => {
    const html = renderToStaticMarkup(
      <AOFDataTableSkeleton columns={3} label="Loading People" rows={4} />
    );
    expect(count(html, HEAD)).toBe(3);
    expect(count(html, CELL)).toBe(12);
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading People");
  });

  it("keeps the table's eight-row box, each row as tall as the list says", () => {
    const html = renderToStaticMarkup(
      <AOFDataTableSkeleton columns={2} label="Loading People" />
    );
    // The same sizes as the table it stands in for, so nothing moves when
    // the rows arrive.
    expect(html).toContain("[--data-table-row:var(--field-height)]");
    expect(html).toContain(
      "min-h-[calc(var(--field-height)+(var(--data-table-row)+1px)*8+2px)]"
    );
    expect(html).toContain("h-(--data-table-row)");
    expect(html).not.toContain("min-h-0 flex-1 flex-col");
  });

  it("draws ten rows unless told otherwise", () => {
    const html = renderToStaticMarkup(
      <AOFDataTableSkeleton columns={2} label="Loading People" />
    );
    expect(count(html, CELL)).toBe(20);
  });

  it("lays out the columns it is given, a selection column as a box", () => {
    const html = renderToStaticMarkup(
      <AOFDataTableSkeleton
        columns={[{ check: true, track: "3rem" }, { track: "minmax(0,4fr)" }]}
        label="Loading People"
        rows={2}
      />
    );
    expect(html).toContain("grid-template-columns:3rem minmax(0,4fr)");
    // The header's box and each row's.
    expect(count(html, CHECK)).toBe(3);
    expect(count(html, CELL)).toBe(2);
  });

  it("draws cards for a phone and the pager only when asked", () => {
    const bare = renderToStaticMarkup(
      <AOFDataTableSkeleton columns={2} label="Loading People" />
    );
    expect(bare).not.toContain('data-skeleton="card"');
    expect(bare).not.toContain('data-skeleton="pager"');
    const full = renderToStaticMarkup(
      <AOFDataTableSkeleton cards={3} columns={2} label="Loading" pager />
    );
    expect(count(full, /data-skeleton="card"/g)).toBe(3);
    expect(full).toContain('data-skeleton="pager"');
  });

  it("stops pulsing for reduced motion", () => {
    const html = renderToStaticMarkup(
      <AOFDataTableSkeleton columns={1} label="Loading" rows={1} />
    );
    expect(html).toContain("motion-reduce:animate-none");
  });
});
