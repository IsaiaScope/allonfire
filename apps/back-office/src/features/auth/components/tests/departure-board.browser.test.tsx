// @module-tag integration
import { render } from "vitest-browser-react";
import { DepartureBoard } from "../departure-board";

const NOTICE = {
  kana: "管理者専用",
  pauseLabel: "Pause notice",
  text: "Admins only.",
};
/** The Japan Design's running notice (`theme.css`, `--animate-marquee`). */
const MARQUEE = "marquee";

const renderBoard = async () => {
  const screen = await render(
    <DepartureBoard
      kana="まもなく"
      notice={NOTICE}
      platform="1"
      status="Signing in…"
    />
  );
  const copies = screen.getByText(NOTICE.text, { exact: true }).elements();
  return {
    // What assistive tech reaches: no hidden ancestor.
    read: copies.filter((copy) => !copy.closest('[aria-hidden="true"]')),
    running: screen.container.querySelector("p > [aria-hidden]"),
  };
};

describe("DepartureBoard", () => {
  it("reads the notice once, a copy that takes no room on the board", async () => {
    const { read } = await renderBoard();
    expect(read).toHaveLength(1);
    const box = read[0]?.getBoundingClientRect();
    expect(box?.width).toBeLessThanOrEqual(1);
    expect(box?.height).toBeLessThanOrEqual(1);
  });

  it("runs the notice it shows, without end", async () => {
    const { running } = await renderBoard();
    expect(running && getComputedStyle(running)).toMatchObject({
      animationIterationCount: "infinite",
      animationName: MARQUEE,
    });
  });
});
