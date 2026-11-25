// @module-tag integration

import { renderInApp } from "@/shared/tests/render-in-app";
import { fitGrid } from "../../utils/fit-grid";
import { MemoryGrid } from "../memory-grid";

// (Where 4 by 3 and 6 by 2 give the same card, within a pixel or two, the CSS
// may pick the other: the measured grid corrects it a moment later.)
// The room is never measured here: the server's page, before the browser has
// laid anything out, which is when the skeleton is all there is to see.
vi.mock("../../hooks/use-memory-grid-size", () => ({
  useMemoryGridSize: () => ({ fit: null, ref: () => undefined }),
}));

const CARDS = Array.from({ length: 12 }, (_, index) => `card-${index + 1}`);
const HEADER = 36;
const GAP = 12;

const ROOMS = [
  ["a phone", { height: 640, width: 360 }],
  ["a square window", { height: 700, width: 900 }],
  ["a wide window", { height: 700, width: 1100 }],
  ["a landscape phone", { height: 320, width: 844 }],
] as const;

describe("MemoryGrid before its room is measured", () => {
  it.each(ROOMS)(
    "draws the card slots at once on %s, in the layout and size the measured grid will take",
    async (_name, room) => {
      const screen = await renderInApp({
        children: (
          <div
            className="flex flex-col"
            style={{ height: room.height, width: room.width }}
          >
            <MemoryGrid
              fallback={CARDS.map((id) => <div key={id} />)}
              header={<div style={{ height: HEADER }} />}
            >
              {null}
            </MemoryGrid>
          </div>
        ),
      });
      const slots = [
        ...screen.container.querySelectorAll(
          "[data-slot=memory-fallback] > div"
        ),
      ];
      expect(slots).toHaveLength(12);
      const first = slots[0]?.getBoundingClientRect();
      // The room is what the page leaves under the header and its gap.
      const fit = fitGrid({
        height: room.height - HEADER - GAP,
        width: room.width,
      });
      const columns = new Set(
        slots.map((slot) => slot.getBoundingClientRect().left)
      ).size;
      expect(columns).toBe(fit.cols);
      // The header is as wide as the cards, ends lined up with the first and
      // last of them, before any JavaScript has measured anything.
      const header = screen.container
        .querySelector("[data-slot=memory-header]")
        ?.getBoundingClientRect();
      const last = slots.at(-1)?.getBoundingClientRect();
      expect(header?.left).toBeCloseTo(first?.left ?? -1, 0);
      expect(header?.right).toBeCloseTo(
        Math.max(...slots.map((slot) => slot.getBoundingClientRect().right)),
        0
      );
      expect(last).toBeDefined();
      // Within a few px of the exact fit: the measured grid replaces it.
      expect(Math.abs((first?.width ?? 0) - fit.cardWidth)).toBeLessThanOrEqual(
        4
      );
    }
  );
});
