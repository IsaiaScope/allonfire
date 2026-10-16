// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOF_TAB_BAR_CLEARANCE, AOFTabBar } from "../aof-tab-bar";

describe("AOFTabBar", () => {
  it("is a named navigation fixed to the bottom, on a phone only", () => {
    const html = renderToStaticMarkup(
      <AOFTabBar label="Main menu">
        <a href="#home">Home</a>
      </AOFTabBar>
    );
    expect(html).toContain('<nav aria-label="Main menu"');
    expect(html).toContain("fixed");
    expect(html).toContain("md:hidden");
    expect(html).toContain("h-(--tab-bar-height)");
    expect(html).toContain('data-slot="tab-bar"');
  });

  it("names the clearance a page adds above it, on a phone only", () => {
    expect(AOF_TAB_BAR_CLEARANCE).toContain("md:pb-0");
  });
});
