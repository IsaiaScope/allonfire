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
});
