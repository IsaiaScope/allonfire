"use client";

import { Button } from "@allonfire/ui/components/button";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { parseErrorMessage } from "@/lib/parse-error-message";
import { triggerGenerationAction } from "../actions/generate";

type GeneratePromptButtonProps = {
  topicId: string;
};

export function GeneratePromptButton({ topicId }: GeneratePromptButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleGenerate() {
    startTransition(async () => {
      const result = await triggerGenerationAction(topicId);
      if (!result.success) {
        toast.error("Failed to generate prompt", {
          description: parseErrorMessage(
            result.error ?? "An unexpected error occurred."
          ),
        });
      }

      router.refresh();
    });
  }

  return (
    <Button disabled={pending} onClick={handleGenerate} size="sm">
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="size-4" />
          Generate prompt
        </>
      )}
    </Button>
  );
}
