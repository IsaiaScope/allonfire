"use client";

import { Badge } from "@allonfire/ui/components/badge";
import { Button } from "@allonfire/ui/components/button";
import { Card } from "@allonfire/ui/components/card";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { PLATFORM_CONFIG } from "../constants/platforms";
import type { usePublishWizard } from "../hooks/use-publish-wizard";

type PublishWizardState = ReturnType<typeof usePublishWizard>["state"];

type ConfirmStepProps = {
  state: PublishWizardState;
  onPublish: () => void;
  onBack: () => void;
};

export function ConfirmStep({ state, onPublish, onBack }: ConfirmStepProps) {
  return (
    <div className="mx-auto max-w-lg space-y-6">
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
          disabled={state.loadingPhase === "publishing"}
          onClick={onPublish}
        >
          {state.loadingPhase === "publishing" ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <Send className="mr-1.5 size-4" />
          )}
          Publish
        </Button>
      </div>
    </div>
  );
}
