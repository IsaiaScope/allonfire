// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { cdp, page, server } from "vitest/browser";
import { render } from "vitest-browser-react";
import { computedValue } from "../../../shared/tests/computed-style";
import { AOFPage, type AOFPageProps } from "../components/aof-page";

const TEXT = "Hi";
const SIDES = ["Top", "Right", "Bottom", "Left"] as const;
type Side = (typeof SIDES)[number];
/** The safe edge each side keeps to (base.css). */
const GUTTER = {
  Bottom: "var(--gutter-bottom)",
  Left: "var(--gutter-left)",
  Right: "var(--gutter-right)",
  Top: "var(--gutter-top)",
} as const satisfies Record<Side, string>;
/** A phone's notch and home indicator, larger than the gutters they meet. */
const NOTCH = {
  Bottom: 34,
  Left: 47,
  Right: 47,
  Top: 59,
} as const satisfies Record<Side, number>;

/** Draws the screen with `insets` (`env(safe-area-inset-*)`), as a notched
 *  phone does; `{}` takes them away. Only Chromium can. */
const notch = (insets: {
  bottom?: number;
  left?: number;
  right?: number;
  top?: number;
}) => cdp().send("Emulation.setSafeAreaInsetsOverride", { insets });

const renderPage = async (props: AOFPageProps = {}) => {
  const screen = await render(<AOFPage {...props}>{TEXT}</AOFPage>);
  const element = screen.container.firstElementChild;
  if (!element) {
    throw new Error("the page drew nothing");
  }
  return element;
};

const padding = (element: Element, side: Side) =>
  getComputedStyle(element)[`padding${side}`];

const gutter = (side: Side) =>
  computedValue(`padding-${side.toLowerCase()}`, GUTTER[side]);

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

describe("AOFPage", () => {
  it("fills the screen's height as the main", async () => {
    const main = await renderPage();
    expect(main.getBoundingClientRect().height).toBe(window.innerHeight);
  });

  // Only the page that is the screen fills it: one nested in a frame is as
  // tall as the frame lets it be.
  it("takes the screen's height only as the main", async () => {
    const section = await renderPage({ as: "section" });
    expect(section.getBoundingClientRect().height).toBeLessThan(
      window.innerHeight
    );
  });

  // Every page keeps clear of a phone's corners, notch and home indicator
  // (the edges in base.css), unless it says otherwise for one side.
  it("keeps to the safe edges by default, one side at a time overridable", async () => {
    const main = await renderPage({ className: "pb-24" });
    for (const side of ["Top", "Right", "Left"] as const) {
      expect(padding(main, side)).toBe(gutter(side));
    }
    expect(padding(main, "Bottom")).toBe(
      computedValue("padding-bottom", "calc(var(--spacing) * 24)")
    );
    expect(padding(main, "Bottom")).not.toBe(gutter("Bottom"));
  });
});

// WebKit has no way to draw a notch.
describe.runIf(server.browser === "chromium")(
  "AOFPage on a notched screen",
  () => {
    afterEach(() => notch({}));

    it("keeps each side clear of the notch and home indicator it meets", async () => {
      const main = await renderPage();
      await notch({
        bottom: NOTCH.Bottom,
        left: NOTCH.Left,
        right: NOTCH.Right,
        top: NOTCH.Top,
      });
      for (const side of SIDES) {
        expect(padding(main, side)).toBe(`${NOTCH[side]}px`);
      }
    });
  }
);
