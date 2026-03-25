"use client";

import { Badge } from "@allonfire/ui/components/badge";
import { Button } from "@allonfire/ui/components/button";
import { Card } from "@allonfire/ui/components/card";
import { Label } from "@allonfire/ui/components/label";
import { ArrowLeft, Calendar, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { PLATFORM_CONFIG } from "../constants/platforms";
import type { usePublishWizard } from "../hooks/use-publish-wizard";

type PublishWizardState = ReturnType<typeof usePublishWizard>["state"];
type PublishWizardActions = ReturnType<typeof usePublishWizard>["actions"];

type ConfirmStepProps = {
  state: PublishWizardState;
  actions: PublishWizardActions;
  onPublish: () => void;
  onBack: () => void;
};

export function ConfirmStep({
  state,
  actions,
  onPublish,
  onBack,
}: ConfirmStepProps) {
  const [mode, setMode] = useState<"now" | "schedule">("now");

  function handleModeChange(newMode: "now" | "schedule") {
    setMode(newMode);
    if (newMode === "now") {
      actions.setScheduleAt(null);
    }
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    actions.setScheduleAt(value ? new Date(value) : null);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card className="p-6">
        <h3 className="mb-4 font-medium text-lg">When to publish?</h3>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50">
            <input
              checked={mode === "now"}
              name="publish-mode"
              onChange={() => handleModeChange("now")}
              type="radio"
            />
            <Send className="size-4" />
            <span className="font-medium text-sm">Publish Now</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50">
            <input
              checked={mode === "schedule"}
              name="publish-mode"
              onChange={() => handleModeChange("schedule")}
              type="radio"
            />
            <Calendar className="size-4" />
            <span className="font-medium text-sm">Schedule for Later</span>
          </label>
          {mode === "schedule" && (
            <div className="ml-8 space-y-2">
              <Label htmlFor="schedule-date">Date and Time</Label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                id="schedule-date"
                min={new Date().toISOString().slice(0, 16)}
                onChange={handleDateChange}
                type="datetime-local"
                value={
                  state.scheduleAt
                    ? state.scheduleAt.toISOString().slice(0, 16)
                    : ""
                }
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-3 font-medium text-lg">Summary</h3>
        <p className="mb-3 text-muted-foreground text-sm">
          Publishing to {state.selectedPlatforms.length}{" "}
          {state.selectedPlatforms.length === 1 ? "platform" : "platforms"}
        </p>
        <div className="flex flex-wrap gap-2">
          {state.selectedPlatforms.map((platform) => (
            <Badge key={platform} variant="secondary">
              {PLATFORM_CONFIG[platform]?.label ?? platform}
            </Badge>
          ))}
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          className="w-full sm:w-auto"
          disabled={state.loadingPhase === "publishing"}
          onClick={onBack}
          variant="ghost"
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
        <Button
          className="w-full sm:w-auto"
          disabled={
            state.loadingPhase === "publishing" ||
            (mode === "schedule" && !state.scheduleAt)
          }
          onClick={onPublish}
        >
          {state.loadingPhase === "publishing" ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 size-4" />
          )}
          {mode === "schedule" ? "Schedule" : "Publish"}
        </Button>
      </div>
    </div>
  );
}
