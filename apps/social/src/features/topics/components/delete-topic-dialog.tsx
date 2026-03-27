"use client";

import type { Topic } from "@allonfire/database";
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
import { ReadOnlyButton } from "@/components/read-only-button";

type DeleteTopicDialogProps = {
  deletePending: boolean;
  disabled?: boolean;
  onDelete: () => void;
  topic: Topic;
};

export function DeleteTopicDialog({
  deletePending,
  disabled,
  onDelete,
  topic,
}: DeleteTopicDialogProps) {
  if (disabled) {
    return (
      <ReadOnlyButton className="px-3 py-2" size="xs" variant="destructive">
        <Trash2 className="size-3" />
        Delete
      </ReadOnlyButton>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="px-3 py-2"
          disabled={deletePending}
          size="xs"
          variant="destructive"
        >
          <Trash2 className="size-3" />
          {deletePending ? "Deleting..." : "Delete"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this topic?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &ldquo;
            <strong>
              {topic.title.length > 50
                ? `${topic.title.slice(0, 50)}…`
                : topic.title}
            </strong>
            &rdquo;. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>
            {deletePending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
