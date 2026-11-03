"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@allonfire/shadcn/components/dialog";

// ponytail: shadcn's dialog (Base UI) under AOF names, like AOFCard: focus
// trap, Escape, labelling and the Design's corners come with it. Add
// behaviour here, never in packages/shadcn. A dialog that confirms an
// irreversible act is AOFAlertDialog.
export const AOFDialog = Dialog;
export const AOFDialogContent = DialogContent;
export const AOFDialogTitle = DialogTitle;
export const AOFDialogFooter = DialogFooter;
