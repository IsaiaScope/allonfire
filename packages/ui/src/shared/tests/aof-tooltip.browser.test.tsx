// @module-tag integration
import { render } from "vitest-browser-react";
import { AOFTooltip } from "../components/aof-tooltip";

describe("AOFTooltip", () => {
  // A tip opening over its control's edge (its arrow, or its slide in) would
  // take the pointer off the control, close, and open again: a flicker.
  it("lets the pointer through its tip, so the tip never takes its control's hover", async () => {
    const screen = await render(
      <AOFTooltip defaultOpen label="Reset">
        <button aria-label="Reset the list" type="button" />
      </AOFTooltip>
    );
    await expect.element(screen.getByText("Reset")).toBeVisible();
    const tip = document.querySelector("[data-slot=tooltip-content]");
    expect(tip && getComputedStyle(tip).pointerEvents).toBe("none");
  });
});
