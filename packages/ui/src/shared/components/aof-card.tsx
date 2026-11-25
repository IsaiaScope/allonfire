import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/shadcn/components/card";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../utils/utils";

/**
 * A line along the card's foot: 2px, across its whole width, under what is
 * drawn on it. Its colour is the App's (`after:bg-*` in `className`): the
 * shared card knows no Design.
 */
const card = cva("", {
  variants: {
    foot: {
      true: "relative isolate after:absolute after:inset-x-0 after:bottom-0 after:h-0.5",
    },
  },
});

export type AOFCardProps = ComponentProps<typeof Card> &
  VariantProps<typeof card>;

// ponytail: shadcn's card under AOF names; a list's phone cards are its one
// user. Add behaviour here, never in packages/shadcn.
export const AOFCard = ({ className, foot, ...props }: AOFCardProps) => (
  <Card className={cn(card({ foot }), className)} {...props} />
);
export const AOFCardAction = CardAction;
export const AOFCardContent = CardContent;
export const AOFCardHeader = CardHeader;
export const AOFCardTitle = CardTitle;
