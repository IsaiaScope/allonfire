"use client";

import { Button } from "@allonfire/ui/components/button";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { elaborateAction } from "../actions/publish";
import type { usePublishWizard } from "../hooks/use-publish-wizard";
import { ContentEditor } from "./content-editor";
import { ImageUpload } from "./image-upload";

type PublishWizardState = ReturnType<typeof usePublishWizard>["state"];
type PublishWizardActions = ReturnType<typeof usePublishWizard>["actions"];

type ComposeStepProps = {
  state: PublishWizardState;
  actions: PublishWizardActions;
  onNext: () => void;
  role?: string;
};

export function ComposeStep({
  state,
  actions,
  onNext,
  role,
}: ComposeStepProps) {
  const hasContent =
    state.originalContent.length > 0 || state.imageFiles.length > 0;

  async function handleElaborate() {
    actions.setElaborating(true);
    try {
      const result = await elaborateAction(state.originalContent);
      if (result.success) {
        actions.setContent(result.data.content);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to elaborate content");
    } finally {
      actions.setElaborating(false);
    }
  }

  return (
    <div className="space-y-4">
      <ContentEditor
        content={state.originalContent}
        isElaborating={state.loadingPhase === "elaborating"}
        onContentChange={actions.setContent}
        onElaborate={handleElaborate}
        role={role}
      />
      <ImageUpload
        imageFiles={state.imageFiles}
        imagePreviewUrls={state.imagePreviewUrls}
        onImageRemove={actions.removeImage}
        onImagesAdd={actions.addImages}
        onImagesReorder={actions.reorderImages}
      />
      <div className="flex justify-end">
        <Button
          className="w-full sm:w-auto"
          disabled={!hasContent}
          onClick={onNext}
        >
          Next
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </div>
    </div>
  );
}
