"use client";

import { Button } from "@allonfire/ui/components/button";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { ReadOnlyButton } from "@/components/read-only-button";

type ContentEditorProps = {
  content: string;
  onContentChange: (content: string) => void;
  onElaborate: () => void;
  isElaborating: boolean;
  role?: string;
};

export function ContentEditor({
  content,
  onContentChange,
  onElaborate,
  isElaborating,
  role,
}: ContentEditorProps) {
  const isViewer = role === "VIEWER";
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        onContentChange(text);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file. Please try again.");
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="font-medium text-sm" htmlFor="content-editor">
        Content
      </label>
      <textarea
        className="min-h-[240px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        id="content-editor"
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="Write your post content here..."
        value={content}
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {content.length} chars
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            accept=".md"
            className="hidden"
            onChange={handleFileUpload}
            ref={fileInputRef}
            type="file"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="secondary"
          >
            <Upload className="mr-1.5 size-4" />
            .md
          </Button>
          {isViewer ? (
            <ReadOnlyButton>
              <Sparkles className="mr-1.5 size-4" />
              <span className="hidden sm:inline">Elaborate</span>
              <span className="sm:hidden">AI</span>
            </ReadOnlyButton>
          ) : (
            <Button
              disabled={content.length === 0 || isElaborating}
              onClick={onElaborate}
            >
              {isElaborating ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 size-4" />
              )}
              <span className="hidden sm:inline">Elaborate</span>
              <span className="sm:hidden">AI</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
