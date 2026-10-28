import { aofButtonVariants } from "@allonfire/ui/components/aof-button";
import { cn } from "@allonfire/ui/lib/utils";
import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import {
  ActionKanji,
  type ActionKanjiProps,
  kanjiAction,
} from "@/shared/components/brush-kanji";

/**
 * A toolbar action's shape: `icon`, always a square icon button (`--field-height`), three
 * quarters of its kanji showing at the right edge (Delete); `responsive`,
 * that icon button while the toolbar is narrow and, once it is wide, the
 * App's kanji button, the label beside the icon and the kanji brushed at its
 * right end (Add).
 */
export type ToolbarActionShape = "icon" | "responsive";

const button = cva("w-(--field-height) min-w-0 px-0", {
  variants: {
    shape: {
      icon: "",
      responsive: "@4xl:w-auto @4xl:min-w-40 @4xl:pr-12 @4xl:pl-5",
    },
  },
});

// As an icon button the kanji sits on the right edge, a quarter of it cut
// away, small enough to leave the icon alone.
const kanji = cva("right-0 left-auto translate-x-1/4 text-3xl", {
  variants: {
    shape: {
      icon: "",
      responsive: "@4xl:right-1 @4xl:translate-x-0 @4xl:text-5xl",
    },
  },
});

const label = cva("hidden", {
  variants: { shape: { icon: "", responsive: "@4xl:inline" } },
});

/** A toolbar's pictogram tile (`--field-tile`, a 20px icon): the fields' night tile in
 *  the dark theme; in the light one a soft grey, since black read too heavy
 *  beside the light controls. It opens the search box and the Filter button
 *  alike. */
export const pictogramTile = cva(
  "flex size-(--field-tile) shrink-0 items-center justify-center rounded-sm bg-muted text-foreground *:size-5 dark:bg-background"
);

/** A toolbar control that opens on a `pictogramTile` (the search box, the
 *  Filter button): one field's look for both, a field's edge and ground that
 *  stay put on hover and while open (a filled hover hid the light tile), only
 *  the edge darkening, the text muted like a placeholder. */
export const tiledControl = cva(
  "h-(--field-height) border-input bg-transparent text-base text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:bg-transparent hover:text-muted-foreground aria-expanded:border-muted-foreground/50 aria-expanded:bg-transparent aria-expanded:text-muted-foreground md:text-base dark:bg-input/30 dark:aria-expanded:bg-input/30 dark:hover:bg-input/30"
);

/** The classes of a toolbar action drawn as `variant`, in `shape`. */
export const toolbarActionClass = (
  shape: ToolbarActionShape,
  variant: "default" | "destructive" = "default"
) =>
  cn(
    aofButtonVariants({ size: "field", variant }),
    kanjiAction(),
    button({ shape })
  );

/** What a toolbar action holds: its kanji, its icon, and its label once wide
 *  (its name is the button's `aria-label` either way). */
export const ToolbarActionBody = ({
  icon,
  kanjiProps,
  label: words,
  shape,
}: {
  icon: ReactNode;
  /** The kanji's own props: its character, its ink on a button that is not
   *  the primary one. */
  kanjiProps: ActionKanjiProps;
  label: string;
  shape: ToolbarActionShape;
}) => (
  <>
    <ActionKanji
      {...kanjiProps}
      className={cn(kanji({ shape }), kanjiProps.className)}
    />
    {icon}
    <span className={label({ shape })}>{words}</span>
  </>
);
