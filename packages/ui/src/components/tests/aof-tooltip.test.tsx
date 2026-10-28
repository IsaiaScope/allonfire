// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFTooltip } from "../aof-tooltip";

// Open, the tip is a portal, which only a browser draws.
describe("AOFTooltip", () => {
  it("draws its control, keeping the control's own name, and no tip while closed", () => {
    const html = renderToStaticMarkup(
      <AOFTooltip label="Delete">
        <button aria-label="Delete selected" type="button" />
      </AOFTooltip>
    );
    expect(html).toContain('aria-label="Delete selected"');
    expect(html).not.toContain("tooltip-content");
  });
});
