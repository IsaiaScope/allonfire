"use client";

import type { Prompt } from "@allonfire/database";
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
import { Check, ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { parseErrorMessage } from "@/lib/parse-error-message";
import { deletePromptAction } from "../actions/prompt";

type PromptCardProps = {
  onAction: () => void;
  prompt: Prompt;
};

export function PromptCard({ onAction, prompt }: PromptCardProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

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

  const preview = prompt.content.slice(0, 150).replace(/\n/g, " ");
  const timestamp = new Date(prompt.createdAt).toLocaleString();

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <Card className="transition-colors hover:border-primary/30">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-2">
            <CollapsibleTrigger asChild>
              <button
                className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-left"
                type="button"
              >
                {open ? (
                  <ChevronUp className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-xs">{timestamp}</p>
                  {!open && (
                    <p className="mt-1 line-clamp-2 text-sm">
                      {preview}
                      {prompt.content.length > 150 && "..."}
                    </p>
                  )}
                </div>
              </button>
            </CollapsibleTrigger>
            <Button
              className="shrink-0"
              onClick={handleCopy}
              size="xs"
              variant="ghost"
            >
              {copied ? (
                <Check className="size-3.5 text-green-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="rounded-md bg-muted/50 p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {prompt.content}
              </pre>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t pt-3">
              <Button onClick={handleCopy} size="xs" variant="outline">
                {copied ? (
                  <>
                    <Check className="size-3 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    Copy prompt
                  </>
                )}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={deletePending}
                    size="xs"
                    variant="destructive"
                  >
                    <Trash2 className="size-3" />
                    {deletePending ? "Deleting..." : "Delete"}
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
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
