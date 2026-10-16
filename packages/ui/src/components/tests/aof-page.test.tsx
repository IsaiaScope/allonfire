// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFPage } from "../aof-page";

describe("AOFPage", () => {
  it("renders a full-height main by default", () => {
    const html = renderToStaticMarkup(<AOFPage>Hi</AOFPage>);
    expect(html).toContain("<main");
    expect(html).toContain("min-h-dvh");
    expect(html).toContain('data-layout="stack"');
  });

  it("takes another tag, a layout and the caller's props", () => {
    const html = renderToStaticMarkup(
      <AOFPage as="section" className="p-2" data-state="idle" layout="split">
        Hi
      </AOFPage>
    );
    expect(html).toContain("<section");
    expect(html).toContain("lg:flex-row");
    expect(html).toContain("p-2");
    expect(html).toContain('data-state="idle"');
  });

  // Every page keeps clear of a phone's corners, notch and home indicator
  // (the edges in base.css), unless it says otherwise for one side.
  it("keeps to the safe edges by default, one side at a time overridable", () => {
    const html = renderToStaticMarkup(<AOFPage className="pb-24">Hi</AOFPage>);
    expect(html).toContain("pt-(--gutter-top)");
    expect(html).toContain("pr-(--gutter-right)");
    expect(html).toContain("pl-(--gutter-left)");
    expect(html).toContain("pb-24");
    expect(html).not.toContain("pb-(--gutter-bottom)");
  });

  // A page that draws to the screen's edges on purpose (a full-bleed view)
  // keeps clear of nothing.
  it("drops the safe edges when told to", () => {
    const html = renderToStaticMarkup(<AOFPage edges="none">Hi</AOFPage>);
    expect(html).not.toContain("--gutter-");
  });
});
