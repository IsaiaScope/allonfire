// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { StationSign } from "../station-sign";

vi.mock("next/image", async () => ({
  default: (await import("@/shared/tests/image-mock")).ImageMock,
}));

const LOGO_HEADING = new RegExp(
  `<h1[^>]*><span data-alt="${BACK_OFFICE.NAME}"[^>]*data-src="data:image/svg\\+xml,`
);

const sign = () =>
  renderToStaticMarkup(<StationSign seal={<i data-seal />}>body</StationSign>);

// Its band at night, and both parts see-through: its browser test.
describe("StationSign", () => {
  it("heads the page with the App's logo, inside the page's HTML", () => {
    const html = sign();
    expect(html).toMatch(LOGO_HEADING);
    expect(html).toContain(">body<");
  });

  it("ends the band with the seal", () => {
    expect(sign()).toContain("data-seal");
  });
});
