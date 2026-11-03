// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFBadge } from "../aof-badge";

describe("AOFBadge", () => {
  it("draws its label on shadcn's chip", () => {
    const html = renderToStaticMarkup(
      <AOFBadge variant="secondary">Admin</AOFBadge>
    );
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain(">Admin<");
  });
});
