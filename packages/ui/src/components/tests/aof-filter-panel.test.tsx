// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFFilterPanel } from "../aof-filter-panel";

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
});
