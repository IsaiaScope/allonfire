// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFGooeyNav } from "../aof-gooey-nav";

const ITEMS = [{ label: "Light" }, { label: "Dark" }, { label: "System" }];
const BUTTON = /<button[^>]*>/g;
const NAV = /<nav[^>]*>/;
const CURRENT = /aria-current="page"/g;
const CURRENT_DARK = /aria-current="page"[^>]*><span>Dark<\/span>/;
const ACTIVE_BUTTON = /<button[^>]*aria-current="page"[^>]*>/;
const CSS_PILL = "group-not-data-ready/gooey:group-data-active:bg-(--gn-pill)";
const CSS_PILL_INK =
  "group-not-data-ready/gooey:group-data-active:text-(--gn-active-ink)";

const html = (props: Partial<Parameters<typeof AOFGooeyNav>[0]> = {}) =>
  renderToStaticMarkup(
    <AOFGooeyNav activeIndex={1} items={ITEMS} {...props} />
  );

describe("AOFGooeyNav", () => {
  it("draws every item's label as a button", () => {
    const markup = html();
    expect(markup.match(BUTTON)).toHaveLength(ITEMS.length);
    for (const { label } of ITEMS) {
      expect(markup).toContain(`<span>${label}</span>`);
    }
  });

  it("marks only the active option as the current page", () => {
    const markup = html();
    expect(markup.match(CURRENT)).toHaveLength(1);
    expect(markup).toMatch(CURRENT_DARK);
    expect(markup).toContain('data-active=""');
  });

  it("draws an item with an href as a link", () => {
    const markup = html({ items: [{ href: "/a", label: "A" }] });
    expect(markup).toContain('href="/a"');
    expect(markup).not.toContain("<button");
  });

  it("wears the Design's corners, never a capsule", () => {
    const markup = html();
    expect(markup.match(NAV)?.[0]).toContain("rounded-lg");
    expect(markup.match(ACTIVE_BUTTON)?.[0]).toContain("rounded-md");
    expect(markup).not.toContain("rounded-full");
  });

  it("paints the chosen option as a CSS pill in the server's HTML, before the engine is ready", () => {
    const markup = html({ activeTextColor: "#111111", color: "#00a650" });
    const button = markup.match(ACTIVE_BUTTON)?.[0];
    expect(button).toContain(CSS_PILL);
    expect(button).toContain(CSS_PILL_INK);
    expect(markup.match(NAV)?.[0]).toContain("group/gooey");
    expect(markup.match(NAV)?.[0]).not.toContain("data-ready");
    expect(markup).toContain("--gn-pill:#00a650");
    expect(markup).toContain("--gn-active-ink:#111111");
  });

  it("picks a readable ink for the pill when none is given", () => {
    expect(html({ color: "#ffffff" })).toContain("--gn-active-ink:#18161d");
    expect(html({ color: "#000000" })).toContain("--gn-active-ink:#ffffff");
  });

  it("keeps the caller's class and style", () => {
    const markup = html({ className: "w-full", style: { margin: 4 } });
    expect(markup.match(NAV)?.[0]).toContain("w-full");
    expect(markup).toContain("margin:4px");
  });
});
