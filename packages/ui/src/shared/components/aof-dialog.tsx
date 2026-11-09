"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@allonfire/shadcn/components/dialog";
import type { ComponentProps } from "react";
import { SAFE_AREA } from "../constants/safe-area";
import { cn } from "../utils/utils";

// ponytail: shadcn's dialog (Base UI) under AOF names, like AOFCard: focus
// trap, Escape, labelling and the Design's corners come with it. Add
// behaviour here, never in packages/shadcn. A dialog that confirms an
// irreversible act is AOFAlertDialog.
export const AOFDialog = Dialog;
/** Inside the safe edges however tall, scrolling what does not fit. */
export const AOFDialogContent = ({
  className,
  ...props
}: ComponentProps<typeof DialogContent>) => (
  <DialogContent className={cn(SAFE_AREA.CENTRED, className)} {...props} />
);
export const AOFDialogTitle = DialogTitle;
export const AOFDialogFooter = DialogFooter;
