import { cva } from "class-variance-authority";
import { BrushKanji } from "@/shared/components/brush-kanji";

/**
 * The kanji brushed behind the header's right end, cut by its edges: 線
 * the line, 駅 the station. Each must be in the brush face's subset
 * (`japan/fonts/README.md`).
 */
const KANJI = ["線", "駅"] as const;

/** Where each one is painted, right to left. */
const stroke = cva("", {
  variants: {
    kanji: {
      線: "-top-5 right-44 text-[5.5rem]",
      駅: "-top-8 -right-4 text-[7.5rem]",
    },
  },
});

/**
 * A layer under the header's controls (the header is `isolate`), its right
 * end only, clipped to the header.
 */
export const HeaderKanji = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-96 max-w-full overflow-hidden"
  >
    {KANJI.map((kanji) => (
      <BrushKanji
        className={stroke({ kanji })}
        kanji={kanji}
        key={kanji}
        placement="header"
      />
    ))}
  </div>
);
