// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { SectionPage } from "../section-page";

describe("SectionPage", () => {
  it("ends twice the bottom gutter above the edge, home indicator included", () => {
    const html = renderToStaticMarkup(<SectionPage>Users</SectionPage>);
    expect(html).toContain("pb-[calc(var(--gutter-bottom)*2)]");
    expect(html).not.toContain("pb-(--gutter-bottom)");
  });

  it("fills the page area by default, as a list does", () => {
    expect(
      renderToStaticMarkup(<SectionPage>Users</SectionPage>)
    ).not.toContain("max-w-");
  });

  it("holds a form page to the form width, centred", () => {
    const html = renderToStaticMarkup(
      <SectionPage width="form">Add a User</SectionPage>
    );
    expect(html).toContain("mx-auto");
    expect(html).toContain("max-w-4xl");
  });

  it("lets a page grow past the screen, so its padding stays under its last row", () => {
    const html = renderToStaticMarkup(
      <SectionPage width="form">Add a User</SectionPage>
    );
    expect(html).not.toContain("min-h-");
    // A list's page too: its table sets how short it gets.
    expect(
      renderToStaticMarkup(<SectionPage>Users</SectionPage>)
    ).not.toContain("min-h-");
  });
});
