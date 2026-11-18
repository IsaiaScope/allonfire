"use client";

import { IconLoader2 } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { AOFAction } from "../../../shared/constants/action";
import type { AOFActionDressing } from "../../../shared/types/action-dressing";
import { cn } from "../../../shared/utils/utils";
import {
  AOFSubmitButton,
  type AOFSubmitButtonProps,
} from "../../form/components/aof-submit-button";

type AOFGateSubmitProps = Omit<
  AOFSubmitButtonProps,
  "pendingChildren" | "size"
> & {
  /** Which action it is: the Design's mark for it sits behind the label. */
  action: AOFAction;
  actions: AOFActionDressing;
  icon: ReactNode;
  /** What the button says while pending. */
  pendingLabel: string;
};

/**
 * A signed-out page's one action: the Design's mark behind the label,
 * taking all the row's width left over (a button never shrinks by itself,
 * so the row's other parts, the way back, would push it out of the card).
 * It takes the submit button's own props: `className` replaces the
 * row-filling width (e.g. `w-full` where the button sits alone), `disabled`
 * switches it off for good (once the link it asks for is sent); only the
 * pictograms and the pending words are its own.
 */
export const AOFGateSubmit = ({
  action,
  children,
  className,
  actions,
  icon,
  pendingLabel,
  ...props
}: AOFGateSubmitProps) => (
  <AOFSubmitButton
    {...props}
    className={cn(
      actions.className,
      // Every row but a lone button's takes what the way back leaves.
      className ?? "min-w-0 flex-1 shrink"
    )}
    pendingChildren={
      <>
        {actions.marks[action]}
        <IconLoader2 aria-hidden className="animate-spin" />
        {pendingLabel}
      </>
    }
    size="field"
  >
    {actions.marks[action]}
    {icon}
    {children}
  </AOFSubmitButton>
);
