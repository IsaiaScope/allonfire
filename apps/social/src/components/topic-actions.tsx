"use client";

import { Button } from "@allonfire/ui/components/button";
import { Archive, Sparkles } from "lucide-react";
import { useTransition } from "react";
import { archiveTopicAction, selectTopicAction } from "@/app/actions/topics";

export function SelectTopicButton({ topicId }: { topicId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await selectTopicAction(topicId);
        })
      }
      size="xs"
      variant="default"
    >
      <Sparkles className="size-3" />
      {pending ? "Selecting..." : "Select"}
    </Button>
  );
}

export function ArchiveTopicButton({ topicId }: { topicId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await archiveTopicAction(topicId);
        })
      }
      size="xs"
      variant="ghost"
    >
      <Archive className="size-3" />
      {pending ? "Archiving..." : "Archive"}
    </Button>
  );
}
