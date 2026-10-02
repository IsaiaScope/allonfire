// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFThemeToggle } from "../aof-theme-toggle";

describe("AOFThemeToggle", () => {
  it("renders a labelled AOF button holding both icons for CSS to pick", () => {
    const html = renderToStaticMarkup(<AOFThemeToggle label="Switch theme" />);
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('aria-label="Switch theme"');
    expect(html).toContain('type="button"');
    expect(html).toContain("dark:hidden");
    expect(html).toContain("dark:block");
  });
});
