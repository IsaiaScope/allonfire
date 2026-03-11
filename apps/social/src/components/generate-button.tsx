"use client";

import { Button } from "@allonfire/ui/components/button";
import { Loader2, Sparkles } from "lucide-react";
import { useTransition } from "react";
import { triggerGenerationAction } from "@/app/actions/generate";

export function GenerateButton({ topicId }: { topicId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await triggerGenerationAction(topicId);
        })
      }
      size="sm"
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="size-3.5" />
          Generate Posts
        </>
      )}
    </Button>
  );
}
