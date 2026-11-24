// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFViewPanel } from "../components/aof-view-panel";

const COLUMNS = [
  { id: "size", label: "Size" },
  { id: "apps", label: "Apps" },
];
const LABELS = {
  clear: "Clear the search",
  empty: "No column",
  search: "Columns",
};
const nothing = () => undefined;

const html = (hidden: string[]) =>
  renderToStaticMarkup(
    <AOFViewPanel
      columns={COLUMNS}
      hidden={hidden}
      labels={LABELS}
      onHiddenChange={nothing}
    />
  );
const CHECKED = 'data-checked="true"';

describe("AOFViewPanel", () => {
  it("draws a row per column, checked while the column shows, after a search box", () => {
    const markup = html(["size"]);
    expect(markup).toContain('placeholder="Columns"');
    expect(markup).toContain("Size");
    expect(markup).toContain("Apps");
    expect(markup.match(/data-checked="true"/g)).toHaveLength(1);
    expect(markup.indexOf(CHECKED)).toBeGreaterThan(markup.indexOf("Size"));
  });

  // The Filters panel scrolls as a whole, so a list cap of its own would
  // nest one scroller inside another.
  it("lets its list grow to its rows, the panel around it doing the scrolling", () => {
    const markup = html([]);
    expect(markup).toContain("max-h-none");
    expect(markup).toContain("overflow-visible");
  });
});
