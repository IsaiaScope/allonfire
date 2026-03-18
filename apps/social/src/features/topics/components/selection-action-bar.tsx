"use client";

import { Button } from "@allonfire/ui/components/button";
import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { bulkSelectTopicsAction } from "../actions/topics";

type SelectionActionBarProps = {
  onClearSelection: () => void;
  onGenerated: () => void;
  selectedIds: Set<string>;
};

export function SelectionActionBar({
  onClearSelection,
  onGenerated,
  selectedIds,
}: SelectionActionBarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const count = selectedIds.size;

  if (count === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-screen-xl items-center justify-center gap-4 px-4 py-3">
        <span className="font-medium text-sm">{count} selected</span>
        <Button onClick={onClearSelection} size="sm" variant="outline">
          <X className="size-3" />
          Deselect All
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await bulkSelectTopicsAction([...selectedIds]);
              onGenerated();
              router.push("/generate");
            })
          }
          size="sm"
        >
          <Sparkles className="size-3" />
          {pending ? "Generating..." : "Generate from Selected"}
        </Button>
      </div>
    </div>
  );
}
