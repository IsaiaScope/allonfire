// @module-tag integration
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AOFTooltip } from "../components/aof-tooltip";

/** Longer than a tip's open delay: a tip that was going to open has. */
const TIP_WAIT_MS = 600;

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

  // A control that shows its own words (a wide button) needs no tip repeating
  // them; the same control as an icon (its label hidden) does.
  it("opens no tip over a control that already shows its words", async () => {
    const screen = await render(
      <AOFTooltip label="Send test email">
        <button type="button">
          <span>Send test email</span>
        </button>
      </AOFTooltip>
    );
    await userEvent.hover(screen.getByRole("button"));
    await new Promise((resolve) => setTimeout(resolve, TIP_WAIT_MS));
    expect(document.querySelector("[data-slot=tooltip-content]")).toBeNull();
  });

  it("opens its tip over a control whose label is hidden", async () => {
    const screen = await render(
      <AOFTooltip label="Send test email">
        <button aria-label="Send test email" type="button">
          <svg aria-hidden height={16} width={16} />
          <span hidden>Send test email</span>
        </button>
      </AOFTooltip>
    );
    await userEvent.hover(screen.getByRole("button"));
    await vi.waitFor(() =>
      expect(
        document.querySelector("[data-slot=tooltip-content]")
      ).not.toBeNull()
    );
  });
});
