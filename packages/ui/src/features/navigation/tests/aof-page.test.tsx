// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFPage } from "../components/aof-page";

describe("AOFPage", () => {
  it("renders a main, stacked, by default", () => {
    const html = renderToStaticMarkup(<AOFPage>Hi</AOFPage>);
    expect(html).toContain("<main");
    expect(html).toContain('data-layout="stack"');
  });

  it("takes another tag, a layout and the caller's props", () => {
    const html = renderToStaticMarkup(
      <AOFPage
        as="section"
        className="caller-class"
        data-state="idle"
        layout="split"
      >
        Hi
      </AOFPage>
    );
    expect(html).toContain("<section");
    expect(html).toContain('data-layout="split"');
    expect(html).toContain("caller-class");
    expect(html).toContain('data-state="idle"');
  });
});
