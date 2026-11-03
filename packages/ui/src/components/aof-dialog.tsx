"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@allonfire/shadcn/components/dialog";
import type { ComponentProps } from "react";

// ponytail: shadcn's dialog (Base UI) as-is, like AOFField: focus trap,
// Escape, labelling and the Design's corners come with it. A dialog that
// confirms an irreversible act is AOFAlertDialog.

export const AOFDialog = (props: ComponentProps<typeof Dialog>) => (
  <Dialog {...props} />
);
export const AOFDialogContent = (
  props: ComponentProps<typeof DialogContent>
) => <DialogContent {...props} />;
export const AOFDialogTitle = (props: ComponentProps<typeof DialogTitle>) => (
  <DialogTitle {...props} />
);
export const AOFDialogFooter = (props: ComponentProps<typeof DialogFooter>) => (
  <DialogFooter {...props} />
);
