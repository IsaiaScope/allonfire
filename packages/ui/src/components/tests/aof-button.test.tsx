// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFButton } from "../aof-button";

describe("AOFButton", () => {
  it("renders the shadcn button with its default variant", () => {
    const html = renderToStaticMarkup(<AOFButton>Save</AOFButton>);
    expect(html).toContain('data-slot="button"');
    expect(html).toContain("bg-primary");
    expect(html).toContain(">Save<");
  });

  it("forwards the variant", () => {
    const html = renderToStaticMarkup(
      <AOFButton variant="outline">Save</AOFButton>
    );
    expect(html).toContain("border-border");
    expect(html).not.toContain("bg-primary ");
  });
});
