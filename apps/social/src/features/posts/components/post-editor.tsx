"use client";

import { Button } from "@allonfire/ui/components/button";
import { Check, Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { updatePostContentAction } from "../actions/posts";

const PLATFORM_LIMITS: Record<string, number> = {
  TWITTER: 280,
  LINKEDIN: 3000,
  YOUTUBE: 500,
};

type PostEditorProps = {
  content: string;
  platform: string;
  postId: string;
};

export function PostEditor({ postId, content, platform }: PostEditorProps) {
  const [value, setValue] = useState(content);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const limit = PLATFORM_LIMITS[platform] ?? 5000;
  const isOverLimit = value.length > limit;
  const hasChanges = value !== content;

  function handleSave() {
    startTransition(async () => {
      await updatePostContentAction(postId, value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        className="min-h-[200px] w-full resize-y rounded-md border bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
        onChange={(e) => setValue(e.target.value)}
        ref={textareaRef}
        value={value}
      />
      <div className="flex items-center justify-between">
        <span
          className={`text-xs ${isOverLimit ? "font-medium text-destructive" : "text-muted-foreground"}`}
        >
          {value.length} / {limit}
        </span>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-emerald-600 text-xs dark:text-emerald-400">
              Saved
            </span>
          )}
          <Button
            disabled={pending || !hasChanges || isOverLimit}
            onClick={handleSave}
            size="sm"
          >
            {pending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="size-3.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
