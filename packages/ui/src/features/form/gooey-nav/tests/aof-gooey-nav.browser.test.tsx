// @module-tag integration
import { renderToStaticMarkup } from "react-dom/server";
import { render } from "vitest-browser-react";
import {
  computedValue,
  roundestCorner,
} from "../../../../shared/tests/computed-style";
import { AOFGooeyNav } from "../components/aof-gooey-nav";

const ITEMS = [{ label: "Light" }, { label: "Dark" }, { label: "System" }];
/** The pill's colour and its label's ink, as the caller gives them. */
const PILL = { COLOR: "#00a650", INK: "#111111" } as const;

const designCorner = (token: string) =>
  computedValue("border-top-left-radius", `var(${token})`);
const colour = (value: string) => computedValue("color", value);

/**
 * The server's HTML, laid in the page with no script run: what a visitor
 * sees before the engine draws (`data-ready`).
 */
const serverHtml = () => {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(
    <AOFGooeyNav
      activeIndex={1}
      activeTextColor={PILL.INK}
      color={PILL.COLOR}
      items={ITEMS}
    />
  );
  document.body.append(host);
  try {
    const options = [
      ...host.querySelectorAll("nav > div > ul:not([aria-hidden]) button"),
    ];
    const chosen = host.querySelector('button[aria-current="page"]');
    if (!chosen) {
      throw new Error("the server drew no chosen option");
    }
    const paint = (option: Element) => {
      const { backgroundColor, color } = getComputedStyle(option);
      return { backgroundColor, color };
    };
    return {
      chosen: paint(chosen),
      others: options.filter((option) => option !== chosen).map(paint),
    };
  } finally {
    host.remove();
  }
};

describe("AOFGooeyNav", () => {
  it("wears the Design's corners, never a capsule", async () => {
    const screen = await render(<AOFGooeyNav activeIndex={1} items={ITEMS} />);
    const nav = screen.container.querySelector("nav");
    const chosen = screen.getByRole("button", { name: "Dark" }).element();
    expect(nav && getComputedStyle(nav).borderTopLeftRadius).toBe(
      designCorner("--radius-lg")
    );
    expect(getComputedStyle(chosen).borderTopLeftRadius).toBe(
      designCorner("--radius-md")
    );
    expect(roundestCorner(screen.container)).toBeLessThanOrEqual(
      Number.parseFloat(designCorner("--radius-lg"))
    );
  });

  it("paints the chosen option as a CSS pill in the server's HTML, before the engine is ready", () => {
    const { chosen, others } = serverHtml();
    expect(chosen.backgroundColor).toBe(colour(PILL.COLOR));
    expect(chosen.color).toBe(colour(PILL.INK));
    expect(others.length).toBe(ITEMS.length - 1);
    for (const option of others) {
      expect(option.backgroundColor).toBe(colour("transparent"));
    }
  });
});
