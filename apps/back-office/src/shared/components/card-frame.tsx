import { AOFCard } from "@allonfire/ui/shared/components/aof-card";
import type { ComponentPropsWithoutChildren } from "@allonfire/ui/shared/types/types";
import { cn } from "@allonfire/ui/shared/utils/utils";
import type { ReactNode } from "react";
import { BrushKanji } from "./brush-kanji";

/**
 * A Services provider's or Storage bucket's card, the real one's and its
 * skeleton's alike, so nothing moves when the data arrives: the Users cards'
 * platform sign (the line's colour along its foot, a kanji brushed large and
 * faint behind, cut by its corner), and a container the card's own width
 * queries read. Any other prop (a `role="group"` with its name) goes to the
 * card.
 */
export const CardFrame = ({
  children,
  className,
  kanji,
  ...props
}: ComponentPropsWithoutChildren<typeof AOFCard> & {
  children: ReactNode;
  kanji: string;
}) => (
  <AOFCard
    className={cn(
      "@container relative isolate after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-line/50",
      className
    )}
    {...props}
  >
    <BrushKanji
      className="-right-24 -bottom-64 -z-10 text-[40rem] text-foreground/3"
      kanji={kanji}
      placement="header"
    />
    {children}
  </AOFCard>
);
