import { cva } from "class-variance-authority";
import { BrushKanji } from "@/shared/components/brush-kanji";

/**
 * The kanji painted down the whole height of the sidebar's wall, each cut by
 * its edges: 線 the line, 乗 to board, 着 to arrive, 駅 the station. Every one must be in the brush face's
 * subset (`japan/fonts/README.md`).
 */
const KANJI = ["線", "乗", "着", "駅"] as const;

/** Where each one is painted, top to bottom, alternating sides. */
const stroke = cva("", {
  variants: {
    kanji: {
      乗: "top-[24%] -left-10 text-[10rem]",
      着: "top-[48%] -right-8 text-[9rem]",
      線: "-top-8 -right-12 text-[11rem]",
      駅: "-bottom-12 -left-12 text-[17rem]",
    },
  },
});

/**
 * The sidebar's wall: a layer behind its rows, clipped to the sidebar; folded
 * to its icons, the rail keeps slivers of the same strokes. The rows paint
 * above it because they come after it and are positioned (`relative`).
 */
export const SidebarKanji = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 overflow-hidden"
  >
    {KANJI.map((kanji) => (
      <BrushKanji
        className={stroke({ kanji })}
        kanji={kanji}
        key={kanji}
        placement="sidebar"
      />
    ))}
  </div>
);
