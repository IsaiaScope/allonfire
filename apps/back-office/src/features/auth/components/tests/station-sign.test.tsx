// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { StationSign } from "../station-sign";

vi.mock("next/image", async () => ({
  default: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

const LOGO_HEADING = new RegExp(
  `<h1[^>]*><span data-alt="${BACK_OFFICE.name}"[^>]*data-src="data:image/svg\\+xml,`
);

const sign = () =>
  renderToStaticMarkup(
    <StationSign seal={<i data-seal />} status="Reset password">
      body
    </StationSign>
  );

// Its band at night, and both parts see-through: its browser test.
describe("StationSign", () => {
  it("heads the page with the App's logo, inside the page's HTML", () => {
    const html = sign();
    expect(html).toMatch(LOGO_HEADING);
    expect(html).toContain(">body<");
  });

  it("names the page under the band, once, before the form", () => {
    const html = sign();
    expect(html.match(/Reset password/g)).toHaveLength(1);
    expect(html.indexOf("Reset password")).toBeLessThan(html.indexOf(">body<"));
  });

  it("ends the band with the seal", () => {
    expect(sign()).toContain("data-seal");
  });
});
