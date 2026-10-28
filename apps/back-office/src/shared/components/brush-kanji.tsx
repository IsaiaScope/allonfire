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
         *  label and cut by its edges, in its label's colour: every variant
         *  tints its own. */
        button: "top-1/2 right-3 -translate-y-1/2 text-8xl text-current/20",
        /** Faint behind the page header's right end; the caller places it
         *  in a layer under the header's controls. */
        header: "z-auto text-foreground/6",
        /** Faint on the sidebar's ground, above it rather than behind (the
         *  drawer has no stacking context to sit in); the caller places it. */
        sidebar: "z-auto text-sidebar-foreground/6",
        /** Behind a toast's words, in their colour, as tall as the toast
         *  and more (its backdrop is a container: `cqh`), cut by its edges,
         *  coming in from the left edge, cut off more the taller the toast
         *  (by `cqh`: about a tenth on one line, a third on five), under the pictogram's band (translucent, so it shows
         *  through) and the start of the words; a long message gets a big
         *  one (`AOFToaster`'s backdrop). */
        toast:
          "top-1/2 left-[calc(1.625rem-60cqh)] -translate-y-1/2 text-[max(4.5rem,140cqh)] text-current/15",
        /** Huge across the page, behind everything: top to bottom on a
         *  phone, where a card fills the width, across from `lg` up. Sized
         *  by the screen so both kanji, tilted, stay whole inside it; the
         *  brush's ink sits low in its box, so across it is lifted a little. */
        wall: "-translate-1/2 top-1/2 left-1/2 text-[min(76vw,48svh)] text-foreground/10 [writing-mode:vertical-rl] lg:translate-y-[-55%] lg:text-[min(44vw,80svh)] lg:[writing-mode:horizontal-tb]",
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

/**
 * A page's one action (a button or a link) with a kanji brushed inside it
 * (`ActionKanji`), as a notice, Sign in and a form end on. Drawn with the
 * button's `field` size (`AOFButton size="field"`, `aofButtonVariants`), as
 * tall as the fields; the label keeps clear of the kanji, which has the
 * right end to itself.
 */
export const kanjiAction = cva(
  "relative isolate min-w-40 overflow-hidden pr-12 font-bold"
);

/** The kanji brushed in a `kanjiAction`; `className` for its ink on a button
 *  that is not the primary one (Cancel's red). */
export type ActionKanjiProps = Omit<BrushKanjiProps, "placement">;

export const ActionKanji = ({ className, ...props }: ActionKanjiProps) => (
  <BrushKanji
    className={cn("right-1 text-5xl", className)}
    placement="button"
    {...props}
  />
);
