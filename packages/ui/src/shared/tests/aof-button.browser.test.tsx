// @module-tag integration
import { render } from "vitest-browser-react";
import {
  AOFButton,
  type AOFButtonProps,
  aofButtonVariants,
} from "../components/aof-button";
import { afterTransitions, computedValue } from "./computed-style";
import { CAN_EMULATE_MEDIA, withCoarsePointer } from "./emulated-media";

const LABEL = "Save";
/** What a visitor sees of a button: what a link styled as one must match.
 *  Its cursor is the browser's own over a link, a hand (WebKit computes it
 *  `auto`). */
const LOOK = [
  "backgroundColor",
  "borderColor",
  "borderRadius",
  "color",
  "height",
  "paddingLeft",
] as const;

const button = async (props: AOFButtonProps = {}) => {
  const screen = await render(<AOFButton {...props}>{LABEL}</AOFButton>);
  return screen.getByRole("button", { name: LABEL }).element();
};

const lookOf = (element: Element) => {
  const style = getComputedStyle(element);
  return LOOK.map((property) => style[property]);
};

const fieldHeight = () => computedValue("height", "var(--field-height)");

describe("AOFButton", () => {
  it("paints the default variant in the Design's primary, under a pointer", async () => {
    const style = getComputedStyle(await button());
    expect(style.backgroundColor).toBe(
      computedValue("background-color", "var(--primary)")
    );
    expect(style.cursor).toBe("pointer");
  });

  it("forwards the variant: outline draws the Design's border on the ground, not the primary", async () => {
    const style = getComputedStyle(await button({ variant: "outline" }));
    expect(style.borderColor).toBe(
      computedValue("border-color", "var(--border)")
    );
    expect(style.backgroundColor).toBe(
      computedValue("background-color", "var(--background)")
    );
  });

  it.each([{ variant: "outline" }, { size: "field" }] as const)(
    "styles a link exactly as the button it looks like (%o), its hand included",
    async (options) => {
      const screen = await render(
        <>
          <AOFButton {...options}>{LABEL}</AOFButton>
          <a className={aofButtonVariants(options)} href="#top">
            {LABEL}
          </a>
        </>
      );
      const link = screen.getByRole("link", { name: LABEL }).element();
      expect(lookOf(link)).toEqual(
        lookOf(screen.getByRole("button", { name: LABEL }).element())
      );
      // A link with an address, which every browser points at with a hand.
      expect(link.matches(":any-link")).toBe(true);
    }
  );

  it("draws `field` at a field's height, so a form's buttons line up with its inputs", async () => {
    const element = await button({ size: "field" });
    expect(getComputedStyle(element).height).toBe(fieldHeight());
  });
});

// Only Chromium can be told its pointer is a finger.
describe.runIf(CAN_EMULATE_MEDIA)("AOFButton on a touch screen", () => {
  it("grows `field` with a field to a finger's size", async () => {
    const element = await button({ size: "field" });
    const { field, height, tap } = await withCoarsePointer(async () => ({
      field: fieldHeight(),
      height: (await afterTransitions(element)).height,
      tap: computedValue("height", "var(--tap-target)"),
    }));
    expect(height).toBe(tap);
    expect(field).toBe(tap);
  });
});
