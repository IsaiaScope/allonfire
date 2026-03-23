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
  AlertDialogTrigger,
} from "@allonfire/ui/components/alert-dialog";
import { Button } from "@allonfire/ui/components/button";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";
import { parseErrorMessage } from "@/lib/parse-error-message";

type DeleteAllDialogProps = {
  count: number;
  title: string;
  description: string;
  onConfirm: () => Promise<ActionResult>;
  onDeleted: () => void;
};

export function DeleteAllDialog({
  count,
  title,
  description,
  onConfirm,
  onDeleted,
}: DeleteAllDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (count === 0) {
    return null;
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await onConfirm();
      setOpen(false);
      if (result.success) {
        onDeleted();
      } else {
        toast.error("Failed to delete topics", {
          description: parseErrorMessage(result.error),
        });
      }
    });
  }

  return (
    <AlertDialog onOpenChange={setOpen} open={open}>
      <AlertDialogTrigger asChild>
        <Button
          className="relative h-7 items-center gap-1 pr-4 pl-2 text-xs"
          variant="destructive"
        >
          <Trash2 className="size-3" />
          Delete
          <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-secondary font-semibold text-[10px] text-secondary-foreground">
            {count}
          </span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleDelete}>
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
