"use client";

import type { Prompt } from "@allonfire/database";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PromptCard } from "./prompt-card";

type PromptListProps = {
  prompts: Prompt[];
};

export function PromptList({ prompts }: PromptListProps) {
  const router = useRouter();

  function handleAction() {
    router.refresh();
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
