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
import { useCallback } from "react";

export type AOFAlertDialogProps = {
  /** The button that closes without acting. */
  cancel: string;
  /** The button that acts. */
  confirm: string;
  /** What acting does, and that it cannot be undone. */
  description: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
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
  confirm,
  description,
  onConfirm,
  onOpenChange,
  open,
  pending,
  title,
}: AOFAlertDialogProps) => {
  // A bare `onConfirm` would receive the click event.
  const act = useCallback(() => onConfirm(), [onConfirm]);
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={pending}>
            {cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            aria-busy={pending}
            className="cursor-pointer"
            disabled={pending}
            onClick={act}
            variant="destructive"
          >
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
