// @module-tag unit

import { MEMORY_RULE } from "@allonfire/database/features/apps/laura/constants/memory-rule";
import { GAMES } from "../../constants/games";
import { fitGrid, gridHeight, gridWidth } from "../fit-grid";

const LAYOUT = (room: { height: number; width: number }) => {
  const { cols, rows } = fitGrid(room);
  return `${cols}x${rows}`;
};

describe("fitGrid", () => {
  it.each([
    [{ height: 600, width: 390 }, "3x4"], // a phone upright
    [{ height: 600, width: 900 }, "4x3"], // a desktop
    [{ height: 250, width: 800 }, "6x2"], // a landscape phone's room
  ])("lays %j out as %s", (room, layout) => {
    expect(LAYOUT(room)).toBe(layout);
  });

  it.each([
    { height: 600, width: 390 },
    { height: 600, width: 900 },
    { height: 250, width: 800 },
    { height: 40, width: 40 },
  ])("keeps the card's ratio, 12 cells and the room %j", (room) => {
    const { cardHeight, cardWidth, cols, gap, rows } = fitGrid(room);
    expect(cols * rows).toBe(MEMORY_RULE.CARDS);
    expect(cardWidth).toBeGreaterThan(0);
    expect(cardHeight).toBeGreaterThan(0);
    // The ratio holds within one px of height.
    expect(
      Math.abs(cardHeight - cardWidth / GAMES.MEMORY.CARD.RATIO)
    ).toBeLessThanOrEqual(1);
    // A room too small for its cards still answers; one that fits holds them.
    if (cardWidth >= 1 && room.width > 100) {
      expect(cols * cardWidth + (cols - 1) * gap).toBeLessThanOrEqual(
        room.width
      );
      expect(rows * cardHeight + (rows - 1) * gap).toBeLessThanOrEqual(
        room.height + 1
      );
    }
  });
});

describe("gridWidth", () => {
  it.each([
    { height: 600, width: 390 },
    { height: 600, width: 900 },
    { height: 250, width: 800 },
  ])("is the width the cards take in the room %j", (room) => {
    const fit = fitGrid(room);
    expect(gridWidth(fit)).toBe(
      fit.cols * fit.cardWidth + (fit.cols - 1) * fit.gap
    );
    expect(gridWidth(fit)).toBeLessThanOrEqual(room.width);
  });
});

describe("the smallest card", () => {
  const { MIN_WIDTH_PX } = GAMES.MEMORY.CARD;

  it.each([
    { height: 200, width: 700 },
    { height: 120, width: 1200 },
    { height: 40, width: 40 },
  ])(
    "never gets narrower than the floor, even in the room %j, and says so",
    (room) => {
      const fit = fitGrid(room);
      expect(fit.cardWidth).toBeGreaterThanOrEqual(MIN_WIDTH_PX);
      expect(fit.isFloored).toBe(true);
    }
  );

  it.each([
    { height: 600, width: 390 },
    { height: 900, width: 1400 },
  ])("is not met in the roomy %j", (room) => {
    const fit = fitGrid(room);
    expect(fit.cardWidth).toBeGreaterThan(MIN_WIDTH_PX);
    expect(fit.isFloored).toBe(false);
  });

  it("gives the height the cards take together, for a page that has to grow", () => {
    const fit = fitGrid({ height: 200, width: 700 });
    expect(gridHeight(fit)).toBe(
      fit.rows * fit.cardHeight + (fit.rows - 1) * fit.gap
    );
    expect(gridHeight(fit)).toBeGreaterThan(200);
  });
});
