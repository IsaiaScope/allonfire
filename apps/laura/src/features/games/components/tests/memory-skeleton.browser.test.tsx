// @module-tag integration

import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { page } from "vitest/browser";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { GAMES } from "../../constants/games";
import { MemoryBoard } from "../memory-board";
import { MemoryBoardSkeleton } from "../memory-board-skeleton";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  ...(await import("@allonfire/ui/shared/tests/aof-image-mock")),
  AOFStorageImage: ({ className }: { className?: string }) => (
    <span className={className} data-testid="picture" />
  ),
}));

/** The room the page leaves the board: a wide page, a phone, and a landscape phone's. */
const ROOMS = [
  ["a wide page", { height: 700, width: 900 }],
  ["a phone", { height: 640, width: 360 }],
  [
    "a landscape phone",
    {
      height: SCREEN.VIEWPORT.PHONE_LANDSCAPE.HEIGHT,
      width: SCREEN.VIEWPORT.PHONE_LANDSCAPE.WIDTH,
    },
  ],
] as const;

type Room = (typeof ROOMS)[number][1];

/** `view` in a fixed room, as the frame's flex chain gives it. */
const inRoom = (room: Room, view: React.ReactNode) => (
  <div
    className="@container flex flex-col"
    style={{ height: room.height, width: room.width }}
  >
    {view}
  </div>
);

const rect = (element: Element | null | undefined) => {
  const box = element?.getBoundingClientRect();
  return {
    height: Math.round(box?.height ?? 0),
    width: Math.round(box?.width ?? 0),
  };
};

/** The board in `room`, once its first card is drawn face down. */
const renderDealtBoard = async (room: Parameters<typeof inRoom>[0]) => {
  const screen = await renderInApp({
    children: inRoom(room, <MemoryBoard canUpload={false} />),
  });
  await vi.waitFor(() =>
    page
      .getByRole("button", {
        name: enT("Games.cardFaceDown", { position: 1 }),
      })
      .element()
  );
  return screen;
};

describe("MemoryBoardSkeleton", () => {
  it.each(ROOMS)(
    "lays its cards out as the real board does on %s, so nothing moves when they arrive",
    async (_name, room) => {
      const loaded = await renderInApp({
        children: inRoom(room, <MemoryBoard canUpload={false} />),
      });
      await expect
        .element(
          page.getByRole("button", {
            name: enT("Games.cardFaceDown", { position: 1 }),
          })
        )
        .toBeVisible();
      await document.fonts.ready;
      const header = (root: Element) => ({
        action: rect(root.querySelector("[data-slot=memory-header] button")),
        badges: [
          ...root.querySelectorAll(
            "[data-slot=memory-header] > div > dl:first-child > div"
          ),
        ].map(rect),
      });
      const real = {
        card: rect(loaded.container.querySelector("button[aria-label]")),
        grid: rect(loaded.container.querySelector("[data-slot=memory-grid]")),
        header: header(loaded.container),
      };
      await loaded.unmount();
      const waiting = await renderInApp({
        children: inRoom(room, <MemoryBoardSkeleton />),
      });
      await vi.waitFor(() => {
        if (!waiting.container.querySelector("[data-slot=memory-grid]")) {
          throw new Error("the grid is not laid out");
        }
      });
      const slots = waiting.container.querySelectorAll(
        "[data-slot=memory-grid] > div"
      );
      expect(slots).toHaveLength(12);
      expect(rect(slots[0])).toEqual(real.card);
      // The header is drawn by the same component: its badges and its action
      // are the size they will be.
      await document.fonts.ready;
      const drawn = header(waiting.container);
      expect(drawn.badges).toHaveLength(real.header.badges.length);
      for (const [index, badge] of drawn.badges.entries()) {
        // Within two pixels: a font that settles between two draws moves a width.
        expect(badge.height).toBe(real.header.badges[index]?.height);
        expect(
          Math.abs(badge.width - (real.header.badges[index]?.width ?? 0))
        ).toBeLessThanOrEqual(2);
      }
      expect(drawn.action).toEqual(real.header.action);
      expect(
        rect(waiting.container.querySelector("[data-slot=memory-grid]"))
      ).toEqual(real.grid);
      await waiting.unmount();
    }
  );

  it("keeps every card of a landscape phone inside its room, at touch size", async () => {
    const [, room] = ROOMS[2];
    const screen = await renderDealtBoard(room);
    const frame = screen.container.firstElementChild?.getBoundingClientRect();
    const cards = [...screen.container.querySelectorAll("button[aria-label]")];
    expect(cards).toHaveLength(12);
    for (const card of cards) {
      const box = card.getBoundingClientRect();
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(
        GAMES.MEMORY.CARD.MIN_TARGET_PX
      );
      expect(box.top).toBeGreaterThanOrEqual(frame?.top ?? 0);
      expect(box.bottom).toBeLessThanOrEqual((frame?.bottom ?? 0) + 1);
      expect(box.right).toBeLessThanOrEqual((frame?.right ?? 0) + 1);
    }
  });

  it.each(ROOMS)(
    "lines its header up with the first and last card on %s",
    async (_name, room) => {
      const screen = await renderDealtBoard(room);
      const header = screen.container
        .querySelector("[data-slot=memory-header]")
        ?.getBoundingClientRect();
      const grid = screen.container
        .querySelector("[data-slot=memory-grid]")
        ?.getBoundingClientRect();
      expect(header?.left).toBeCloseTo(grid?.left ?? -1, 0);
      expect(header?.right).toBeCloseTo(grid?.right ?? -1, 0);
    }
  );

  it("says it is loading without its parts being read", async () => {
    await renderInApp({
      children: inRoom(ROOMS[0][1], <MemoryBoardSkeleton />),
    });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(enT("Games.loading"));
    expect(document.querySelector("[data-skeleton=memory]")).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });
});
