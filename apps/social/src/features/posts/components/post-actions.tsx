"use client";

import { Button } from "@allonfire/ui/components/button";
import { Input } from "@allonfire/ui/components/input";
import { Calendar, Check, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import {
  approvePostAction,
  rejectPostAction,
  schedulePostAction,
  unschedulePostAction,
} from "../actions/posts";

export function ApprovePostButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await approvePostAction(postId);
        })
      }
      size="xs"
      variant="default"
    >
      <Check className="size-3" />
      {pending ? "Approving..." : "Approve"}
    </Button>
  );
}

export function RejectPostButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await rejectPostAction(postId);
        })
      }
      size="xs"
      variant="ghost"
    >
      <Trash2 className="size-3" />
      {pending ? "Removing..." : "Reject"}
    </Button>
  );
}

export function SchedulePostButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();
  const [showPicker, setShowPicker] = useState(false);

  function handleSchedule(formData: FormData) {
    const dateStr = formData.get("scheduledAt") as string;
    if (!dateStr) {
      return;
    }
    startTransition(async () => {
      await schedulePostAction(postId, new Date(dateStr));
    });
    setShowPicker(false);
  }

  if (showPicker) {
    return (
      <form action={handleSchedule} className="flex items-center gap-2">
        <Input
          className="h-7 w-auto text-xs"
          defaultValue={defaultScheduleDate()}
          name="scheduledAt"
          type="datetime-local"
        />
        <Button disabled={pending} size="xs" type="submit" variant="default">
          <Check className="size-3" />
        </Button>
        <Button
          onClick={() => setShowPicker(false)}
          size="xs"
          type="button"
          variant="ghost"
        >
          <X className="size-3" />
        </Button>
      </form>
    );
  }

  return (
    <Button onClick={() => setShowPicker(true)} size="xs" variant="outline">
      <Calendar className="size-3" />
      Schedule
    </Button>
  );
}

export function UnschedulePostButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await unschedulePostAction(postId);
        })
      }
      size="xs"
      variant="ghost"
    >
      <X className="size-3" />
      {pending ? "Removing..." : "Unschedule"}
    </Button>
  );
}

function defaultScheduleDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}
