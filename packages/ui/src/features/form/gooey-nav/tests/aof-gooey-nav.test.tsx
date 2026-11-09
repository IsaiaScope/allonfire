// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFGooeyNav } from "../components/aof-gooey-nav";

const ITEMS = [{ label: "Light" }, { label: "Dark" }, { label: "System" }];
const BUTTON = /<button[^>]*>/g;
const NAV = /<nav[^>]*>/;
const CURRENT = /aria-current="page"/g;
const CURRENT_DARK = /aria-current="page"[^>]*><span>Dark<\/span>/;

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

  it("hands the server's HTML the pill's colours, before the engine is ready", () => {
    const markup = html({ activeTextColor: "#111111", color: "#00a650" });
    expect(markup.match(NAV)?.[0]).not.toContain("data-ready");
    expect(markup).toContain("--gn-pill:#00a650");
    expect(markup).toContain("--gn-active-ink:#111111");
  });

  it("picks a readable ink for the pill when none is given", () => {
    expect(html({ color: "#ffffff" })).toContain("--gn-active-ink:#18161d");
    expect(html({ color: "#000000" })).toContain("--gn-active-ink:#ffffff");
  });

  it("keeps the caller's class and style", () => {
    const markup = html({ className: "caller-class", style: { margin: 4 } });
    expect(markup.match(NAV)?.[0]).toContain("caller-class");
    expect(markup).toContain("margin:4px");
  });
});
