// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { BrushKanji } from "../brush-kanji";

describe("BrushKanji", () => {
  it("is decoration: hidden from assistive tech, marked as Japanese", () => {
    const html = renderToStaticMarkup(<BrushKanji kanji="入" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('lang="ja">入<');
  });

  it("paints huge on the wall by default and smaller in a button when asked", () => {
    expect(renderToStaticMarkup(<BrushKanji kanji="入" />)).toContain(
      "text-[min(76vw,48svh)]"
    );
    expect(
      renderToStaticMarkup(<BrushKanji kanji="入" placement="button" />)
    ).toContain("text-8xl");
  });
});
