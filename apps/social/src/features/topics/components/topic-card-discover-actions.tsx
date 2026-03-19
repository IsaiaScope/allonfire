"use client";

import { Button } from "@allonfire/ui/components/button";
import { CollapsibleTrigger } from "@allonfire/ui/components/collapsible";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteTopicAction, selectTopicAction } from "../actions/topics";
import { DeleteTopicDialog } from "./delete-topic-dialog";
import type { TopicCardActionProps } from "./topic-card";

type DiscoverActionsProps = TopicCardActionProps & { onAction: () => void };

export function DiscoverActions({
  isClamped,
  onAction,
  open,
  topic,
}: DiscoverActionsProps) {
  const [selectPending, startSelectTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  function handleDelete() {
    startDeleteTransition(async () => {
      try {
        await deleteTopicAction(topic.id);
        onAction();
      } catch {
        toast.error("Failed to delete topic. Please try again.");
      }
    });
  }

  return (
    <>
      <Button
        className="px-3 py-2"
        disabled={selectPending}
        onClick={() =>
          startSelectTransition(async () => {
            try {
              await selectTopicAction(topic.id);
              onAction();
            } catch {
              toast.error("Failed to select topic. Please try again.");
            }
          })
        }
        size="xs"
        variant="default"
      >
        <Sparkles className="size-3" />
        {selectPending ? "Selecting..." : "Select"}
      </Button>
      <DeleteTopicDialog
        deletePending={deletePending}
        onDelete={handleDelete}
        topic={topic}
      />
      {(isClamped || open) && (
        <CollapsibleTrigger asChild>
          <Button className="ml-auto" size="xs" variant="ghost">
            {open ? (
              <>
                <ChevronUp className="size-3" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="size-3" />
                Details
              </>
            )}
          </Button>
        </CollapsibleTrigger>
      )}
    </>
  );
}
