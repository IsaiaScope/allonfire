"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@allonfire/shadcn/components/alert-dialog";
import { type ReactNode, useCallback } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";

/** Base UI's alert dialog root (`open`, `onOpenChange`, ...), plus its parts. */
export type AOFAlertDialogProps = ComponentPropsWithoutChildren<
  typeof AlertDialog
> & {
  /** The button that closes without acting: its label, or what it holds. */
  cancel: ReactNode;
  /** The Cancel button's own props (an App's Design dresses it). */
  cancelProps?: Omit<
    ComponentPropsWithoutChildren<typeof AlertDialogCancel>,
    "disabled"
  >;
  /** The button that acts: its label, or what it holds. */
  confirm: ReactNode;
  /** The acting button's own props (an App's Design dresses it). */
  confirmProps?: Omit<
    ComponentPropsWithoutChildren<typeof AlertDialogAction>,
    "disabled" | "onClick"
  >;
  /** The dialog's own props: its classes, its size. */
  contentProps?: ComponentPropsWithoutChildren<typeof AlertDialogContent>;
  /** What acting does, and that it cannot be undone. */
  description: string;
  /**
   * Draws the dialog's head around its title (an App's Design dresses it):
   * given the title already named for assistive tech, it returns what tops
   * the dialog. None given: the title heads the text, as shadcn draws it.
   */
  head?: ((title: ReactNode) => ReactNode) | undefined;
  onConfirm: () => void;
  /** While the act runs: both buttons are disabled. */
  pending: boolean;
  title: string;
};

/**
 * A question before something that cannot be undone (shadcn's alert-dialog):
 * a title, what happens, Cancel, and the act in the destructive colour.
 */
export const AOFAlertDialog = ({
  cancel,
  cancelProps,
  confirm,
  confirmProps,
  contentProps,
  description,
  head,
  onConfirm,
  pending,
  title,
  ...props
}: AOFAlertDialogProps) => {
  // A bare `onConfirm` would receive the click event.
  const act = useCallback(() => onConfirm(), [onConfirm]);
  const named = <AlertDialogTitle>{title}</AlertDialogTitle>;
  // The title goes into the head when there is one, else into the text.
  const top = head ? head(named) : null;
  const inText = head ? null : named;
  return (
    <AlertDialog {...props}>
      <AlertDialogContent {...contentProps}>
        {top}
        {/* Under a head of its own the text reads from the left on every
            screen, like the head above it. */}
        <AlertDialogHeader
          className={cn(head && "place-items-start text-left")}
        >
          {inText}
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            {...cancelProps}
            className={cn("cursor-pointer", cancelProps?.className)}
            disabled={pending}
          >
            {cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            aria-busy={pending}
            variant="destructive"
            {...confirmProps}
            className={cn("cursor-pointer", confirmProps?.className)}
            disabled={pending}
            onClick={act}
          >
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
