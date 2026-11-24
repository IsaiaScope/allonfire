// @module-tag integration
import { colorAlpha } from "@allonfire/ui/shared/tests/computed-style";
import { render } from "vitest-browser-react";
import { ActionArt } from "../action-art";

const ALPHA = 0.2;

const paint = () =>
  render(
    <button
      className="relative isolate min-w-40 overflow-hidden bg-primary pr-12 text-primary-foreground"
      type="button"
    >
      <ActionArt art="CRAB_MONO" data-testid="art" />
      Send link
    </button>
  );

describe("ActionArt", () => {
  it("sits behind the label in the button's corner, cut by its edges, hidden from assistive tech", async () => {
    const screen = await paint();
    const art = screen.getByTestId("art").element();
    const style = getComputedStyle(art);
    expect(art.getAttribute("aria-hidden")).toBe("true");
    expect(style.position).toBe("absolute");
    expect(Number.parseInt(style.zIndex, 10)).toBeLessThan(0);
    const button = art.parentElement;
    expect(button).not.toBeNull();
    expect(button && getComputedStyle(button).overflow).toBe("hidden");
    screen.unmount();
  });

  it("takes the label's colour at low opacity, as the Back Office's kanji do, not the theme's primary", async () => {
    const screen = await paint();
    const art = screen.getByTestId("art").element();
    expect(colorAlpha(getComputedStyle(art).color)).toBeCloseTo(ALPHA);
    screen.unmount();
  });

  it("never takes a click from the button", async () => {
    const screen = await paint();
    expect(
      getComputedStyle(screen.getByTestId("art").element()).pointerEvents
    ).toBe("none");
    screen.unmount();
  });
});
