"use client";

import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import { useMemoryGridSize } from "../hooks/use-memory-grid-size";
import { gridHeight, gridWidth } from "../utils/fit-grid";

/**
 * The frame the header and the room stand in, sized by CSS alone before the
 * browser has measured anything (the page as the server sends it, and the
 * first paint): from its own size (`cqw`, `cqh`) it works out `--cols` and
 * `--card` the way `fitGrid` would, by the room's shape (3 by 4 below 3:4,
 * 4 by 3 up to 3:2, 6 by 2 beyond), a card as wide as the width and the height
 * allow, never under 80px. The header and the card slots both read them, so
 * the header is as wide as the cards from the first paint. The measured grid
 * takes over a moment later, a pixel or two off at most. The `66px`, `60px`
 * and `54px` are the header's 48px (36 and a 12 gap) plus the card gaps.
 */
const frame = cva("@container-size relative min-h-0 flex-1");

/**
 * The layer inside the frame that works out `--cols` and `--card` (a
 * container's query styles what stands in it, never the container itself).
 */
const sizing = cva(
  "absolute inset-0 [--card:max(80px,min(calc((100cqw-12px)/3),calc((100cqh-66px)/4*0.75)))] [--cols:3] [@container(min-aspect-ratio:1.5)]:[--card:max(80px,min(calc((100cqw-30px)/6),calc((100cqh-54px)/2*0.75)))] [@container(min-aspect-ratio:1.5)]:[--cols:6] [@container(min-aspect-ratio:3/4)_and_(max-aspect-ratio:1.4999)]:[--card:max(80px,min(calc((100cqw-18px)/4),calc((100cqh-60px)/3*0.75)))] [@container(min-aspect-ratio:3/4)_and_(max-aspect-ratio:1.4999)]:[--cols:4]"
);

/** The card slots, in the frame's `--cols` columns of `--card`. */
const placeholder = cva(
  "pointer-events-none absolute inset-x-0 top-12 mx-auto grid w-fit auto-rows-[calc(var(--card)/0.75)] grid-cols-[repeat(var(--cols),var(--card))] gap-1.5"
);

/** The header row (`h-9`, 36px) and the gap under it (12px), as the frame lays them. */
const HEADER_ROOM_PX = 48;

/**
 * The board's cards laid out to fill the room the page leaves
 * (`fitGrid`), as many columns as that room's shape wants. One layout shared
 * by the real cards and the skeleton's, so what waits is as big as what comes.
 * The room is the flex chain's leftover height, never a viewport calc. The
 * cards stand in it out of flow, so they never stretch what measures them:
 * were they in flow, a window that gets smaller would find the room as tall as
 * the old cards and never lay them out again. The
 * `header` sits above the cards and is as wide as they are, so its ends line
 * up with the first and last card.
 */
export const MemoryGrid = ({
  children,
  fallback,
  header,
  label,
}: {
  children: ReactNode;
  /** The card slots to draw before the room is measured (the skeleton's). */
  fallback?: ReactNode;
  /** The row above the cards: moves, time, the new game button. */
  header: ReactNode;
  /** What the group of cards is called, for a screen reader. */
  label?: string;
}) => {
  const { fit, ref } = useMemoryGridSize();
  return (
    <div
      className={frame()}
      // Cards at their smallest: the frame is as tall as they are (and the
      // header's 48px), so the page grows to hold them instead of the cards
      // shrinking further.
      style={{
        minHeight: fit?.isFloored
          ? gridHeight(fit) + HEADER_ROOM_PX
          : undefined,
      }}
    >
      <div className={sizing()}>
        <div
          className="@container absolute inset-x-0 top-0 mx-auto h-9 w-[calc(var(--cols)*var(--card)+(var(--cols)-1)*6px)]"
          data-slot="memory-header"
          style={{ width: fit ? gridWidth(fit) : undefined }}
        >
          {header}
        </div>
        <div
          className="absolute inset-x-0 top-12 bottom-0"
          data-slot="memory-room"
          ref={ref}
        >
          {fit ? (
            <fieldset
              aria-label={label}
              className="absolute inset-x-0 top-0 mx-auto grid w-fit"
              data-slot="memory-grid"
              style={{
                gap: fit.gap,
                gridAutoRows: `${fit.cardHeight}px`,
                gridTemplateColumns: `repeat(${fit.cols}, ${fit.cardWidth}px)`,
              }}
            >
              {children}
            </fieldset>
          ) : null}
        </div>
        {!fit && fallback ? (
          <div
            aria-hidden
            className={placeholder()}
            data-slot="memory-fallback"
          >
            {fallback}
          </div>
        ) : null}
      </div>
    </div>
  );
};
