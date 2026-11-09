// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { Hanko } from "../hanko";

describe("Hanko", () => {
  it("stacks its characters and hides from assistive tech", () => {
    const html = renderToStaticMarkup(<Hanko seal="認証" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("<span>認</span><span>証</span>");
  });
});
