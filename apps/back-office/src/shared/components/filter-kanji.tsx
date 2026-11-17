import { cva } from "class-variance-authority";
import { BrushKanji } from "@/shared/components/brush-kanji";

/**
 * 改札, the ticket gate: a station's own filter, which lets through only who
 * holds the right ticket. Each must be in the brush face's subset
 * (`japan/fonts/README.md`).
 */
const KANJI = ["改", "札"] as const;

/** Where each one is painted, cut by the panel's edges, like the sidebar's. */
const stroke = cva("-z-10", {
  variants: {
    kanji: {
      改: "-top-6 -right-6 text-[8rem]",
      札: "-bottom-10 -left-8 text-[9rem]",
    },
  },
});

/** The Filter panel's wall: the sidebar's faint brush strokes, behind the
 *  lists (the panel isolates it). */
export const FilterKanji = () => (
  <>
    {KANJI.map((kanji) => (
      <BrushKanji
        className={stroke({ kanji })}
        kanji={kanji}
        key={kanji}
        placement="header"
      />
    ))}
  </>
);
