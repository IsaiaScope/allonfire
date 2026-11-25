// @module-tag integration

import { renderInApp } from "@/shared/tests/render-in-app";
import { GAMES } from "../../constants/games";
import { MemoryGrid } from "../memory-grid";

const CARDS = Array.from({ length: 12 }, (_, index) => `card-${index + 1}`);

/**
 * A page frame as the signed-in one is: its height is a minimum (the viewport),
 * not a fixed size, so whatever stands in it can stretch it.
 */
const frame = (width: number, minHeight: number) => (
  <div
    className="flex flex-col"
    data-testid="frame"
    style={{ minHeight, width }}
  >
    <MemoryGrid header={<div style={{ height: 36 }} />}>
      {CARDS.map((id) => (
        <div key={id} />
      ))}
    </MemoryGrid>
  </div>
);

const gridBox = () =>
  document.querySelector("[data-slot=memory-grid]")?.getBoundingClientRect();

const resize = (width: number, minHeight: number) => {
  const element = document.querySelector<HTMLElement>("[data-testid=frame]");
  if (element) {
    element.style.width = `${width}px`;
    element.style.minHeight = `${minHeight}px`;
  }
};

describe("MemoryGrid in a page whose height is a minimum", () => {
  it("lays its cards out again when the window gets smaller, as a zoom in or a taller sidebar does", async () => {
    await renderInApp({ children: frame(1200, 900) });
    await vi.waitFor(() => {
      expect(gridBox()?.height).toBeGreaterThan(600);
    });
    resize(700, 500);
    await vi.waitFor(() => {
      expect(gridBox()?.height).toBeLessThanOrEqual(500 - 36);
      expect(gridBox()?.width).toBeLessThanOrEqual(700);
    });
  });

  it("lays its cards out again when the room gets bigger", async () => {
    await renderInApp({ children: frame(700, 500) });
    await vi.waitFor(() => {
      expect(gridBox()?.height).toBeGreaterThan(300);
    });
    const before = gridBox()?.height ?? 0;
    resize(1200, 900);
    await vi.waitFor(() => {
      expect(gridBox()?.height).toBeGreaterThan(before);
    });
  });

  it("keeps its cards from getting too small: the page grows instead", async () => {
    const { MIN_WIDTH_PX } = GAMES.MEMORY.CARD;
    await renderInApp({ children: frame(700, 250) });
    await vi.waitFor(() => {
      const card = document.querySelector("[data-slot=memory-grid] > div");
      expect(card?.getBoundingClientRect().width).toBeGreaterThanOrEqual(
        MIN_WIDTH_PX
      );
    });
    // The frame stretched to hold the cards (they are not cut by it).
    await vi.waitFor(() => {
      const frameBox = document
        .querySelector("[data-testid=frame]")
        ?.getBoundingClientRect();
      expect(frameBox?.bottom).toBeGreaterThanOrEqual(
        (gridBox()?.bottom ?? 0) - 1
      );
    });
    // Roomy again: the cards are laid out bigger.
    resize(1200, 900);
    await vi.waitFor(() => {
      const card = document.querySelector("[data-slot=memory-grid] > div");
      expect(card?.getBoundingClientRect().width).toBeGreaterThan(MIN_WIDTH_PX);
    });
  });
});
