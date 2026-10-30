// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFControlBar, AOFControlBarSeparator } from "../aof-control-bar";

const OPENS_WITH_FIELDSET = /^<fieldset /;

describe("AOFControlBar", () => {
  it("groups its controls with a separator and keeps the caller's props", () => {
    const html = renderToStaticMarkup(
      <AOFControlBar aria-label="Preferences" className="absolute">
        <button type="button">A</button>
        <AOFControlBarSeparator />
        <button type="button">B</button>
      </AOFControlBar>
    );
    // A fieldset is a group to assistive tech without a role attribute.
    expect(html).toMatch(OPENS_WITH_FIELDSET);
    expect(html).not.toContain('role="group"');
    expect(html).toContain('aria-label="Preferences"');
    expect(html).toContain("absolute");
    expect(html).toContain('data-slot="separator"');
    expect(html).toContain('data-orientation="vertical"');
  });
});
