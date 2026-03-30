"use client";

import { Button } from "@allonfire/ui/components/button";
import { Check, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { parseErrorMessage } from "@/lib/parse-error-message";
import { updateNoteAction } from "../actions/prompt";

type PromptNoteEditorProps = {
  promptId: string;
  initialNote: string;
  disabled: boolean;
  onAction: () => void;
};

export function PromptNoteEditor({
  promptId,
  initialNote,
  disabled,
  onAction,
}: PromptNoteEditorProps) {
  const [note, setNote] = useState(initialNote);
  const [notePending, startNoteTransition] = useTransition();
  const [noteSaved, setNoteSaved] = useState(false);
  const noteTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  function handleSaveNote() {
    startNoteTransition(async () => {
      const result = await updateNoteAction(promptId, note);
      if (result.success) {
        setNoteSaved(true);
        if (noteTimeoutRef.current) {
          clearTimeout(noteTimeoutRef.current);
        }
        noteTimeoutRef.current = setTimeout(() => setNoteSaved(false), 2000);
        onAction();
      } else {
        toast.error("Failed to save note", {
          description: parseErrorMessage(
            result.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }

  function handleDeleteNote() {
    setNote("");
    startNoteTransition(async () => {
      const result = await updateNoteAction(promptId, "");
      if (result.success) {
        onAction();
      } else {
        toast.error("Failed to delete note", {
          description: parseErrorMessage(
            result.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <textarea
        className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        disabled={disabled}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note about this prompt..."
        value={note}
      />
      <div className="flex items-center gap-2">
        <Button
          className={
            noteSaved ? "bg-green-600 text-white hover:bg-green-700" : ""
          }
          disabled={disabled || notePending || !note}
          onClick={handleSaveNote}
          size="xs"
          variant="default"
        >
          {noteSaved && (
            <>
              <Check className="size-3" />
              Saved
            </>
          )}
          {!noteSaved && (notePending ? "Saving..." : "Save Note")}
        </Button>
        {note && (
          <Button
            className="ml-auto"
            disabled={disabled || notePending}
            onClick={handleDeleteNote}
            size="xs"
            variant="destructive"
          >
            <Trash2 className="size-3" />
            Delete Note
          </Button>
        )}
      </div>
    </div>
  );
}
