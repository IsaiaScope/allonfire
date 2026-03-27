"use client";

import type { Prompt, PromptRating } from "@allonfire/database";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@allonfire/ui/components/alert-dialog";
import { Button } from "@allonfire/ui/components/button";
import { Card, CardContent, CardHeader } from "@allonfire/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@allonfire/ui/components/collapsible";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ReadOnlyButton } from "@/components/read-only-button";
import { parseErrorMessage } from "@/lib/parse-error-message";
import { deletePromptAction, ratePromptAction } from "../actions/prompt";
import { PromptNoteEditor } from "./prompt-note-editor";

type PromptCardProps = {
  onAction: () => void;
  prompt: Prompt;
  role?: string;
};

export function PromptCard({ onAction, prompt, role }: PromptCardProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentRating, setCurrentRating] = useState<PromptRating | null>(
    prompt.rating
  );
  const [deletePending, startDeleteTransition] = useTransition();
  const [ratePending, startRateTransition] = useTransition();
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const isViewer = role === "VIEWER";

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deletePromptAction(prompt.id);
      if (result.success) {
        onAction();
      } else {
        toast.error("Failed to delete prompt", {
          description: parseErrorMessage(
            result.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }

  function handleRate(rating: PromptRating) {
    startRateTransition(async () => {
      const result = await ratePromptAction(prompt.id, rating);
      if (result.success) {
        setCurrentRating(rating);
      } else {
        toast.error("Failed to rate prompt", {
          description: parseErrorMessage(
            result.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }

  const preview = prompt.content.slice(0, 150).replace(/\n/g, " ");
  const timestamp = new Date(prompt.createdAt).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <Card className="gap-1 py-3 transition-colors hover:border-primary/30">
        <CardHeader className="px-4 pb-0">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <button
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                type="button"
              >
                {open ? (
                  <ChevronUp className="size-5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground text-sm">{timestamp}</p>
                    <RatingBadge rating={currentRating} />
                  </div>
                  {!open && (
                    <p className="mt-1 line-clamp-2 text-sm">
                      {preview}
                      {prompt.content.length > 150 && "..."}
                    </p>
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button onClick={handleCopy} size="icon-sm" variant="ghost">
                {copied ? (
                  <Check className="size-3.5 text-green-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
              {isViewer ? (
                <ReadOnlyButton size="icon-sm" variant="ghost">
                  <Trash2 className="size-3.5 text-destructive" />
                </ReadOnlyButton>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={deletePending}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this prompt?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this generated prompt. This
                        action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        {deletePending ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="px-4 pt-0">
            <div className="rounded-md bg-muted/50 p-3">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {prompt.content}
              </pre>
            </div>
            <div className="mt-4 flex items-center gap-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Button
                  className={
                    currentRating === "POSITIVE"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-green-600/10 text-green-600 hover:bg-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20"
                  }
                  disabled={isViewer || ratePending}
                  onClick={() => handleRate("POSITIVE")}
                  size="icon-sm"
                  variant={
                    currentRating === "POSITIVE" ? "default" : "secondary"
                  }
                >
                  <ThumbsUp className="size-4" />
                </Button>
                <Button
                  className={
                    currentRating === "NEGATIVE"
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-red-600/10 text-red-600 hover:bg-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                  }
                  disabled={isViewer || ratePending}
                  onClick={() => handleRate("NEGATIVE")}
                  size="icon-sm"
                  variant={
                    currentRating === "NEGATIVE" ? "default" : "secondary"
                  }
                >
                  <ThumbsDown className="size-4" />
                </Button>
              </div>
              <Button
                className="ml-auto"
                onClick={handleCopy}
                size="icon-sm"
                variant="ghost"
              >
                {copied ? (
                  <Check className="size-3.5 text-green-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
            <PromptNoteEditor
              disabled={isViewer}
              initialNote={prompt.ratingNote ?? ""}
              onAction={onAction}
              promptId={prompt.id}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function RatingBadge({ rating }: { rating: PromptRating | null }) {
  if (!rating) {
    return null;
  }
  if (rating === "POSITIVE") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-green-600 text-xs dark:text-green-400">
        <ThumbsUp className="size-3" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-red-600 text-xs dark:text-red-400">
      <ThumbsDown className="size-2.5" />
    </span>
  );
}
