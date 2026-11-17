// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFSortPanel } from "../components/aof-sort-panel";

const COLUMNS = [
  { id: "created", label: "Created" },
  { id: "size", label: "Size" },
];
const LABELS = {
  add: "Add sort",
  asc: "Asc",
  column: "Column",
  desc: "Desc",
  direction: "Direction",
  drag: "Drag to reorder",
  remove: "Remove sort",
};
const nothing = () => undefined;

const html = (sorting: { desc: boolean; id: string }[], max = 3) =>
  renderToStaticMarkup(
    <AOFSortPanel
      columns={COLUMNS}
      labels={LABELS}
      max={max}
      onSortingChange={nothing}
      sorting={sorting}
    />
  );

describe("AOFSortPanel", () => {
  it("draws no rows, only Add sort, while no sort is set", () => {
    const markup = html([]);
    expect(markup).not.toContain("<li");
    expect(markup).toContain("Add sort");
  });

  it("draws a row per sort, with its remove button", () => {
    const markup = html([
      { desc: false, id: "created" },
      { desc: true, id: "size" },
    ]);
    expect(markup.match(/aria-label="Remove sort"/g)).toHaveLength(2);
  });

  it("leaves Add out at the maximum and when no column is left", () => {
    const one = [{ desc: false, id: "created" }];
    expect(html(one, 1)).not.toContain("Add sort");
    expect(html(one, 2)).toContain("Add sort");
    const both = [
      { desc: false, id: "created" },
      { desc: false, id: "size" },
    ];
    expect(html(both, 5)).not.toContain("Add sort");
  });

  it("gives each row a drag handle", () => {
    const markup = html([
      { desc: false, id: "created" },
      { desc: false, id: "size" },
    ]);
    expect(markup.match(/aria-label="Drag to reorder"/g)).toHaveLength(2);
  });
});
