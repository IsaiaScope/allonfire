// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFFilterPanel } from "../components/aof-filter-panel";

// Open, the panel is a portal, which only a browser draws.
describe("AOFFilterPanel", () => {
  it("names its button and counts the values chosen", () => {
    const html = renderToStaticMarkup(
      <AOFFilterPanel count={3} label="Filters">
        <span>lists</span>
      </AOFFilterPanel>
    );
    expect(html).toContain(">Filters<");
    expect(html).toContain(">3<");
  });

  it("shows no count while nothing is chosen, and the pictogram it is given", () => {
    const html = renderToStaticMarkup(
      <AOFFilterPanel count={0} icon={<i data-testid="tile" />} label="Filters">
        <span>lists</span>
      </AOFFilterPanel>
    );
    expect(html).toContain(">Filters<");
    expect(html).toContain('data-testid="tile"');
    expect(html).not.toContain('data-slot="badge"');
  });

  it("counts the sorts and the hidden columns on the button, beside the filters", () => {
    const html = renderToStaticMarkup(
      <AOFFilterPanel
        count={1}
        counts={{ sort: 2, view: 1 }}
        label="Filters"
        sort={<span>sorts</span>}
        tabLabels={{ filter: "Filter", sort: "Sort", view: "View" }}
        view={<span>columns</span>}
      >
        <span>lists</span>
      </AOFFilterPanel>
    );
    expect(html).toContain(">4<");
  });

  it("counts the filters alone when it has no tabs", () => {
    const html = renderToStaticMarkup(
      <AOFFilterPanel count={2} counts={{ sort: 2, view: 1 }} label="Filters">
        <span>lists</span>
      </AOFFilterPanel>
    );
    expect(html).toContain(">2<");
  });
});
