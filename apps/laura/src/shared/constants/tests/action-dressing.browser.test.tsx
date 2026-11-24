// @module-tag integration
import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { computedValue } from "@allonfire/ui/shared/tests/computed-style";
import { page } from "vitest/browser";
import { renderInApp } from "@/shared/tests/render-in-app";
import { ACTION_DRESSING, COMPACT_ACTION } from "../action-dressing";

/** A compact button is the Back Office's small `card` shape: 32px tall. */
const COMPACT_PX = 32;

const draw = () =>
  renderInApp({
    children: (
      <>
        <AOFButton className={ACTION_DRESSING.className} size="field">
          {ACTION_DRESSING.marks.retry}
          Full
        </AOFButton>
        <AOFButton className={COMPACT_ACTION.className}>
          {COMPACT_ACTION.marks.retry}
          Small
        </AOFButton>
      </>
    ),
  });

const full = () => page.getByRole("button", { name: "Full" }).element();
const small = () => page.getByRole("button", { name: "Small" }).element();

describe("COMPACT_ACTION", () => {
  it("is a 32px button, shorter than the field-height one", async () => {
    await draw();
    expect(small().getBoundingClientRect().height).toBe(COMPACT_PX);
    expect(small().getBoundingClientRect().height).toBeLessThan(
      full().getBoundingClientRect().height
    );
  });

  it("is narrower than the full one, with a smaller label", async () => {
    await draw();
    expect(small().getBoundingClientRect().width).toBeLessThan(
      full().getBoundingClientRect().width
    );
    expect(Number.parseFloat(getComputedStyle(small()).fontSize)).toBeLessThan(
      Number.parseFloat(getComputedStyle(full()).fontSize)
    );
  });

  it("keeps the same heavy label and draws a picture of the sea at its right end, clear of the label", async () => {
    await draw();
    expect(getComputedStyle(small()).fontWeight).toBe("700");
    const art = small().querySelector("span[aria-hidden]");
    expect(art).not.toBeNull();
    const label = [...small().childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE
    );
    const range = document.createRange();
    range.selectNodeContents(label ?? small());
    expect(range.getBoundingClientRect().right).toBeLessThanOrEqual(
      (art?.getBoundingClientRect().left ?? 0) + 1
    );
  });

  it("wears the same colours as the full one", async () => {
    await draw();
    expect(getComputedStyle(small()).color).toBe(
      getComputedStyle(full()).color
    );
    expect(getComputedStyle(small()).backgroundColor).toBe(
      computedValue("background-color", "var(--primary)")
    );
  });
});
