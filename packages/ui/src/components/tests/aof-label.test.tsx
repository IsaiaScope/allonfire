// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFLabel } from "../aof-label";

describe("AOFLabel", () => {
  it("renders the shadcn label bound to its control", () => {
    const html = renderToStaticMarkup(
      <AOFLabel htmlFor="email">Email</AOFLabel>
    );
    expect(html).toContain('data-slot="label"');
    expect(html).toContain('for="email"');
    expect(html).toContain(">Email<");
  });
});
