// @module-tag integration
import { render } from "vitest-browser-react";
import { AOFEdgeTint } from "../components/aof-edge-tint";

const TINT = "edge tint";

// The strip only exists for iOS Safari's toolbar (it samples a real, fixed,
// solid element at the screen's edge): everywhere else it must take no room
// and no part in the page.
describe("AOFEdgeTint", () => {
  it("is hidden from assistive technology and takes no part outside iOS Safari", async () => {
    const screen = await render(<AOFEdgeTint data-testid={TINT} />);
    const strip = screen.getByTestId(TINT).element();
    expect(strip.getAttribute("aria-hidden")).toBe("true");
    expect(getComputedStyle(strip).display).toBe("none");
    screen.unmount();
  });

  // Where it shows is the stylesheet's rule: only iOS WebKit, in a tab.
  it("is shown by a rule for iOS WebKit in a tab", async () => {
    const screen = await render(<AOFEdgeTint data-testid={TINT} />);
    const rules = Array.from(document.styleSheets).flatMap((sheet) =>
      Array.from(sheet.cssRules).map((rule) => rule.cssText)
    );
    expect(
      rules.some(
        (rule) =>
          rule.includes("-webkit-touch-callout") &&
          rule.includes("display-mode: browser") &&
          rule.includes("display: block")
      )
    ).toBe(true);
    screen.unmount();
  });
});
