// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { Torii } from "../torii";

// Its colours: its browser test.
describe("Torii", () => {
  it("is decoration, hidden from assistive tech", () => {
    expect(renderToStaticMarkup(<Torii />)).toContain('aria-hidden="true"');
  });
});
