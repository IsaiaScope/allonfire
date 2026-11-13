"use client";

import {
  AOFSubmitButton,
  type AOFSubmitButtonProps,
} from "@allonfire/ui/features/form/components/aof-submit-button";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";

type GateSubmitProps = Omit<
  AOFSubmitButtonProps,
  "pendingChildren" | "size"
> & {
  icon: ReactNode;
  kanji: string;
  /** What the button says while pending. */
  pendingLabel: string;
};

/**
 * A password page's one action: its kanji behind the label, taking all the
 * row's width left over (a button never shrinks by itself, so the row's
 * other parts, the way back, would push it out of the card). It takes the
 * submit button's own props: `className` replaces the row-filling width (e.g.
 * `w-full` where the button sits alone), `disabled` switches it off for good
 * (once the link it asks for is sent); only the pictograms and the pending
 * words are its own.
 */
export const GateSubmit = ({
  children,
  className,
  icon,
  kanji,
  pendingLabel,
  ...props
}: GateSubmitProps) => (
  <AOFSubmitButton
    {...props}
    className={cn(
      kanjiAction(), // Every row but a lone button's takes what the way back leaves.
      className ?? "min-w-0 flex-1 shrink"
    )}
    pendingChildren={
      <>
        <LoaderCircle aria-hidden className="animate-spin" />
        {pendingLabel}
      </>
    }
    size="field"
  >
    <ActionKanji kanji={kanji} />
    {icon}
    {children}
  </AOFSubmitButton>
);
