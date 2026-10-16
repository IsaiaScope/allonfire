import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const kanji = cva(
  "pointer-events-none absolute -z-10 -rotate-12 whitespace-nowrap font-brush leading-none",
  {
    defaultVariants: { placement: "wall" },
    variants: {
      placement: {
        /** Inside a button (`relative isolate overflow-hidden`), behind its
         *  label and cut by its edges. */
        button:
          "top-1/2 right-3 -translate-y-1/2 text-8xl text-primary-foreground/20",
        /** Huge across the page, behind everything: top to bottom on a
         *  phone, where a card fills the width, across from `lg` up. Sized
         *  by the screen so both kanji, tilted, stay whole inside it; the
         *  brush's ink sits low in its box, so across it is lifted a little. */
        wall: "-translate-1/2 top-1/2 left-1/2 text-[min(76vw,48svh)] text-foreground/10 [writing-mode:vertical-rl] lg:-translate-y-[55%] lg:text-[min(44vw,80svh)] lg:[writing-mode:horizontal-tb]",
      },
    },
  }
);

export type BrushKanjiProps = ComponentPropsWithoutChildren<"span"> &
  VariantProps<typeof kanji> & {
    /** The kanji, which the Japan Design's brush face must carry
     *  (`fonts/README.md`). */
    kanji: string;
  };

/**
 * A kanji painted with a brush, askew: huge on the wall behind a page, or
 * in a button's corner. Decoration only: hidden from assistive tech, which
 * reads the page's own words, and marked as Japanese.
 */
export const BrushKanji = ({
  className,
  kanji: text,
  placement,
  ...props
}: BrushKanjiProps) => (
  <span
    aria-hidden
    className={cn(kanji({ placement }), className)}
    lang="ja"
    {...props}
  >
    {text}
  </span>
);
