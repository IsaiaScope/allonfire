"use client";

import type { Prompt } from "@allonfire/database";
import { useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PromptCard } from "./prompt-card";

type PromptListProps = {
  prompts: Prompt[];
};

export function PromptList({ prompts }: PromptListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  function handleAction() {
    router.refresh();
    queryClient.invalidateQueries({ queryKey: ["generate-topics"] });
  }

  if (prompts.length === 0) {
    return (
      <EmptyState
        description="Click Generate to create a content prompt for this topic."
        icon={FileText}
        title="No prompts yet"
      />
    );
  }

  return (
    <div className="space-y-3">
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} onAction={handleAction} prompt={prompt} />
      ))}
    </div>
  );
}
