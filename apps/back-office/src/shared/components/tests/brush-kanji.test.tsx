// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { BrushKanji } from "../brush-kanji";

// How big it paints, and in which face: its browser test.
describe("BrushKanji", () => {
  it("is decoration: hidden from assistive tech, marked as Japanese", () => {
    const html = renderToStaticMarkup(<BrushKanji kanji="入" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('lang="ja">入<');
  });
});
