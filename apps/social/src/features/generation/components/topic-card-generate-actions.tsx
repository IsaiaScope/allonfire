"use client";

import { Button } from "@allonfire/ui/components/button";
import { CollapsibleTrigger } from "@allonfire/ui/components/collapsible";
import { ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteTopicAction } from "@/features/topics/actions/topics";
import { DeleteTopicDialog } from "@/features/topics/components/delete-topic-dialog";
import type { TopicCardActionProps } from "@/features/topics/components/topic-card";
import { parseErrorMessage } from "@/lib/parse-error-message";
import { triggerGenerationAction } from "../actions/generate";

type GenerateActionsProps = TopicCardActionProps & {
  onAction: () => void;
};

export function GenerateActions({
  isClamped,
  onAction,
  open,
  topic,
}: GenerateActionsProps) {
  const [generatePending, startGenerateTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  function handleGenerate() {
    startGenerateTransition(async () => {
      const result = await triggerGenerationAction(topic.id);
      if (result.success) {
        toast.success("Prompt generated.");
        onAction();
      } else {
        toast.error("Failed to generate prompt", {
          description: parseErrorMessage(
            result.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteTopicAction(topic.id);
      if (result.success) {
        onAction();
      } else {
        toast.error("Failed to delete topic", {
          description: parseErrorMessage(
            result.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }

  return (
    <>
      <Button
        className="px-3 py-2"
        disabled={generatePending}
        onClick={handleGenerate}
        size="xs"
        variant="default"
      >
        {generatePending ? (
          <>
            <Loader2 className="size-3 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="size-3" />
            Generate
          </>
        )}
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
