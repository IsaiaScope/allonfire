// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { Torii } from "../torii";

describe("Torii", () => {
  it("draws a vermilion gate with its black top beam, hidden from assistive tech", () => {
    const html = renderToStaticMarkup(<Torii />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("fill-hanko");
    expect(html).toContain("fill-led-panel");
  });
});
