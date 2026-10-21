// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFBadge } from "../aof-badge";

describe("AOFBadge", () => {
  it("draws its label on a chip with the Design's corner", () => {
    const html = renderToStaticMarkup(
      <AOFBadge variant="secondary">Admin</AOFBadge>
    );
    expect(html).toContain(">Admin<");
    expect(html).toContain("rounded-sm");
    expect(html).not.toContain("rounded-4xl");
  });
});
