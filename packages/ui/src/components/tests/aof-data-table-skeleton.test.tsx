// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFDataTableSkeleton } from "../aof-data-table-skeleton";

describe("AOFDataTableSkeleton", () => {
  it("draws rows times columns of placeholders and says it is loading", () => {
    const html = renderToStaticMarkup(
      <AOFDataTableSkeleton columns={3} label="Loading People" rows={4} />
    );
    expect(html.match(/data-slot="skeleton"/g)).toHaveLength(12);
    expect(html).toContain("Loading People");
  });

  it("draws ten rows unless told otherwise", () => {
    const html = renderToStaticMarkup(
      <AOFDataTableSkeleton columns={2} label="Loading People" />
    );
    expect(html.match(/data-slot="skeleton"/g)).toHaveLength(20);
  });
});
