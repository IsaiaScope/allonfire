// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { StationSign } from "../station-sign";

// next/image needs Next's loader; its alt and src are all the markup reads.
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <span data-alt={alt} data-src={src} />
  ),
}));

const LOGO_HEADING = new RegExp(
  `<h1[^>]*><span data-alt="${BACK_OFFICE.NAME}" data-src="data:image/svg\\+xml,`
);

const sign = () =>
  renderToStaticMarkup(<StationSign seal={<i data-seal />}>body</StationSign>);

describe("StationSign", () => {
  it("heads the page with the App's logo, inside the page's HTML", () => {
    const html = sign();
    expect(html).toMatch(LOGO_HEADING);
    expect(html).toContain(">body<");
  });

  it("keeps the band at night in either theme, the seal at its end", () => {
    const html = sign();
    expect(html).toContain('class="dark ');
    expect(html).toContain("data-seal");
  });

  it("lets what is painted behind show through band and body", () => {
    const html = sign();
    expect(html).toContain("bg-card/75");
    expect(html).toContain("bg-led-panel/75");
  });
});
