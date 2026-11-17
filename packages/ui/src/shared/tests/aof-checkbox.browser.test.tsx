// @module-tag integration
import { render } from "vitest-browser-react";
import { AOFCheckbox } from "../components/aof-checkbox";
import { afterTransitions, computedValue } from "./computed-style";

/** One box on screen, named so several in a test stay apart. */
const box = async (props: Parameters<typeof AOFCheckbox>[0], label = "Box") => {
  const screen = await render(<AOFCheckbox aria-label={label} {...props} />);
  const element = screen.getByRole("checkbox", { name: label }).element();
  await afterTransitions(element);
  return element;
};

/** Whether the check the box draws is on screen. */
const checkShown = (element: Element) => {
  const indicator = element.querySelector('[data-slot="checkbox-indicator"]');
  return indicator !== null && getComputedStyle(indicator).display !== "none";
};

describe("AOFCheckbox, mixed", () => {
  it("shows a bar in the primary colour, no check", async () => {
    const element = await box({ indeterminate: true });
    expect(checkShown(element)).toBe(false);
    const bar = getComputedStyle(element, "::before");
    expect(bar.backgroundColor).toBe(
      computedValue("background-color", "var(--primary)")
    );
    expect(Number.parseFloat(bar.height)).toBeGreaterThan(0);
    expect(Number.parseFloat(bar.width)).toBeGreaterThan(
      Number.parseFloat(bar.height)
    );
  });

  it("is told apart from empty and from checked by its border", async () => {
    const mixed = getComputedStyle(await box({ indeterminate: true }));
    const empty = getComputedStyle(await box({}, "Empty"));
    const checked = getComputedStyle(await box({ checked: true }, "Checked"));
    expect(mixed.borderColor).toBe(
      computedValue("border-color", "var(--primary)")
    );
    expect(mixed.borderColor).not.toBe(empty.borderColor);
    // Checked fills with the primary; mixed only tints it.
    expect(mixed.backgroundColor).not.toBe(checked.backgroundColor);
    expect(mixed.backgroundColor).not.toBe(empty.backgroundColor);
  });

  it("keeps the check for a checked box", async () => {
    const element = await box({ checked: true });
    expect(checkShown(element)).toBe(true);
    expect(getComputedStyle(element, "::before").content).not.toBe('""');
  });
});
