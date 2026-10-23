// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFButton, aofButtonVariants } from "../aof-button";

describe("AOFButton", () => {
  it("renders the shadcn button with its default variant", () => {
    const html = renderToStaticMarkup(<AOFButton>Save</AOFButton>);
    expect(html).toContain('data-slot="button"');
    expect(html).toContain("bg-primary");
    expect(html).toContain(">Save<");
    expect(html).toContain("cursor-pointer");
  });

  it("forwards the variant", () => {
    const html = renderToStaticMarkup(
      <AOFButton variant="outline">Save</AOFButton>
    );
    expect(html).toContain("border-border");
    expect(html).not.toContain("bg-primary ");
  });

  it("styles a link as a button, pointer included", () => {
    const classes = aofButtonVariants({ variant: "outline" });
    expect(classes).toContain("border-border");
    expect(classes).toContain("cursor-pointer");
  });

  it("draws `field` at a field's height, so a form's buttons line up with its inputs", () => {
    const html = renderToStaticMarkup(<AOFButton size="field">Save</AOFButton>);
    expect(html).toContain("h-11");
    expect(html).not.toContain("h-8");
    expect(aofButtonVariants({ size: "field" })).toContain("h-11");
  });
});
