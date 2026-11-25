import { GAMES } from "../constants/games";

/** The room the page leaves the board, in px. */
export type Room = { height: number; width: number };

/** How the 12 cards lie: columns by rows, each card's size, the gap between. */
export type GridFit = {
  cardHeight: number;
  cardWidth: number;
  cols: number;
  gap: number;
  /** The room is too small for cards this big: the cards keep the floor and the page grows. */
  isFloored: boolean;
  rows: number;
};

const MIN_SIZE = 1;

/** The height the cards take together: what a floored board asks of its page. */
export const gridHeight = ({ cardHeight, gap, rows }: GridFit) =>
  rows * cardHeight + (rows - 1) * gap;

/** The width the cards take together: what the header above them lines up with. */
export const gridWidth = ({ cardWidth, cols, gap }: GridFit) =>
  cols * cardWidth + (cols - 1) * gap;

/**
 * The layout of 3x4, 4x3 or 6x2 that gives the widest card (at the card
 * back's ratio) in `room`, ties to the earlier. It replaces a breakpoint: a
 * landscape phone's wide, short room picks 6x2 by itself.
 */
export const fitGrid = ({ height, width }: Room): GridFit => {
  const gap =
    width > height
      ? GAMES.MEMORY.SIZE.GAP_PX.LANDSCAPE
      : GAMES.MEMORY.SIZE.GAP_PX.PORTRAIT;
  const { MIN_WIDTH_PX, RATIO } = GAMES.MEMORY.CARD;
  let best: { cols: number; fit: number; rows: number } | undefined;
  for (const { cols, rows } of GAMES.MEMORY.LAYOUTS) {
    const byWidth = (width - gap * (cols - 1)) / cols;
    const byHeight = ((height - gap * (rows - 1)) / rows) * RATIO;
    const fit = Math.floor(Math.min(byWidth, byHeight));
    if (!best || fit > best.fit) {
      best = { cols, fit, rows };
    }
  }
  const { cols, fit, rows } = best ?? { cols: 3, fit: MIN_SIZE, rows: 4 };
  const cardWidth = Math.max(MIN_WIDTH_PX, fit);
  return {
    cardHeight: Math.round(cardWidth / RATIO),
    cardWidth,
    cols,
    gap,
    isFloored: fit < MIN_WIDTH_PX,
    rows,
  };
};
