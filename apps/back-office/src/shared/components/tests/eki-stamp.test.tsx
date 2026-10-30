// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { EkiStamp } from "../eki-stamp";

const stamp = () =>
  renderToStaticMarkup(
    <EkiStamp code="404" kana="回送" station="Back Office" />
  );

describe("EkiStamp", () => {
  it("prints the station, the code and the kana in the ring", () => {
    const html = stamp();
    expect(html).toContain(">Back Office<");
    expect(html).toContain(">404<");
    expect(html).toContain(">回送<");
  });

  it("is decoration: hidden from assistive tech, Japanese marked as such", () => {
    const html = stamp();
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('lang="ja"');
  });

  it("is pressed in once, and not for reduced motion", () => {
    expect(stamp()).toContain("motion-safe:animate-stamp");
  });
});
