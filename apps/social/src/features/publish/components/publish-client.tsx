"use client";

import type { Platform } from "@allonfire/database";
import { Card } from "@allonfire/ui/components/card";
import { AlertTriangle } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { adaptContentAction, publishAction } from "../actions/publish";
import { getConnectedAccountsAction } from "../actions/social-accounts";
import { PLATFORM_CONFIG } from "../constants/platforms";
import { usePublishWizard } from "../hooks/use-publish-wizard";
import type { ConnectedAccount, PlatformContent } from "../types/publish-types";
import { ComposeStep } from "./compose-step";
import { ConfirmStep } from "./confirm-step";
import { PlatformsStep } from "./platforms-step";
import { PreviewStep } from "./preview-step";
import { ResultsStep } from "./results-step";
import { WizardStepper } from "./wizard-stepper";

type PublishClientProps = {
  connectedAccounts: ConnectedAccount[];
  configuredPlatforms: Platform[];
  hasAiProvider: boolean;
};

export function PublishClient({
  connectedAccounts: initialAccounts,
  configuredPlatforms,
  hasAiProvider,
}: PublishClientProps) {
  const { state, actions } = usePublishWizard();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(initialAccounts);

  const refreshAccounts = useCallback(async () => {
    const result = await getConnectedAccountsAction();
    if (result.success) {
      setAccounts(result.data);
    }
  }, []);

  const handleAdapt = useCallback(async () => {
    if (!hasAiProvider) {
      const contents: PlatformContent[] = state.selectedPlatforms.map(
        (platform) => {
          const limit = PLATFORM_CONFIG[platform]?.charLimit ?? 1000;
          return {
            platform,
            adaptedContent: state.originalContent,
            charCount: state.originalContent.length,
            isOverLimit: state.originalContent.length > limit,
          };
        }
      );
      actions.setPlatformContents(contents);
      return;
    }

    actions.setAdapting(true);
    try {
      const result = await adaptContentAction(
        state.originalContent,
        state.selectedPlatforms
      );
      if (result.success) {
        const contents: PlatformContent[] = state.selectedPlatforms.map(
          (platform) => {
            const adapted =
              result.data.adaptations[platform] ?? state.originalContent;
            const limit = PLATFORM_CONFIG[platform]?.charLimit ?? 1000;
            return {
              platform,
              adaptedContent: adapted,
              charCount: adapted.length,
              isOverLimit: adapted.length > limit,
            };
          }
        );
        actions.setPlatformContents(contents);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to adapt content");
    } finally {
      actions.setAdapting(false);
    }
  }, [hasAiProvider, state.selectedPlatforms, state.originalContent, actions]);

  const handlePublish = useCallback(async () => {
    actions.setPublishing(true);
    try {
      const adaptations: Record<string, string> = {};
      for (const pc of state.platformContents) {
        adaptations[pc.platform] = pc.adaptedContent;
      }

      const formData = new FormData();
      formData.set("adaptations", JSON.stringify(adaptations));

      for (const file of state.imageFiles) {
        formData.append("images", file);
      }
      if (state.scheduleAt) {
        formData.set("scheduleAt", state.scheduleAt.toISOString());
      }

      const result = await publishAction(formData);
      if (result.success) {
        actions.setResults(result.data.results);
        actions.setStep("results");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to publish content");
    } finally {
      actions.setPublishing(false);
    }
  }, [state.platformContents, state.imageFiles, state.scheduleAt, actions]);

  function goTo(step: "compose" | "platforms" | "preview" | "confirm") {
    actions.setStep(step);
  }

  return (
    <div className="space-y-6 overflow-x-clip">
      <div className="hidden md:block">
        <WizardStepper currentStep={state.step} />
      </div>

      {!hasAiProvider && (
        <Card className="border-yellow-500/50 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              No AI provider configured. Elaborate and adapt features will be
              limited.
            </span>
          </div>
        </Card>
      )}

      {state.step === "compose" && (
        <ComposeStep
          actions={actions}
          onNext={() => goTo("platforms")}
          state={state}
        />
      )}

      {state.step === "platforms" && (
        <PlatformsStep
          actions={actions}
          configuredPlatforms={configuredPlatforms}
          connectedAccounts={accounts}
          onBack={() => goTo("compose")}
          onNext={() => {
            actions.setPlatformContents([]);
            goTo("preview");
          }}
          onRefreshAccounts={refreshAccounts}
          state={state}
        />
      )}

      {state.step === "preview" && (
        <PreviewStep
          actions={actions}
          isAdapting={state.loadingPhase === "adapting"}
          onAdapt={handleAdapt}
          onBack={() => goTo("platforms")}
          onNext={() => goTo("confirm")}
          state={state}
        />
      )}

      {state.step === "confirm" && (
        <ConfirmStep
          actions={actions}
          onBack={() => goTo("preview")}
          onPublish={handlePublish}
          state={state}
        />
      )}

      {state.step === "results" && (
        <ResultsStep onReset={actions.reset} state={state} />
      )}

      <div className="md:hidden">
        <WizardStepper currentStep={state.step} />
      </div>
    </div>
  );
}
