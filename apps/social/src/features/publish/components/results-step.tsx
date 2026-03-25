"use client";

import { Button } from "@allonfire/ui/components/button";
import { Card } from "@allonfire/ui/components/card";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { PLATFORM_CONFIG } from "../constants/platforms";
import type { usePublishWizard } from "../hooks/use-publish-wizard";

type PublishWizardState = ReturnType<typeof usePublishWizard>["state"];

type ResultsStepProps = {
  state: PublishWizardState;
  onReset: () => void;
};

function ResultsHeader({
  failCount,
  successCount,
  totalCount,
}: {
  failCount: number;
  successCount: number;
  totalCount: number;
}) {
  if (failCount === 0) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-2 size-12 text-green-500" />
        <h3 className="font-medium text-lg">All posts published!</h3>
      </div>
    );
  }

  if (successCount === 0) {
    return (
      <div className="text-center">
        <XCircle className="mx-auto mb-2 size-12 text-destructive" />
        <h3 className="font-medium text-lg">Publishing failed</h3>
      </div>
    );
  }

  return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto mb-2 size-12 text-yellow-500" />
      <h3 className="font-medium text-lg">
        Partially published ({successCount}/{totalCount})
      </h3>
    </div>
  );
}

export function ResultsStep({ state, onReset }: ResultsStepProps) {
  const successCount = state.results.filter((r) => r.success).length;
  const failCount = state.results.filter((r) => !r.success).length;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <ResultsHeader
        failCount={failCount}
        successCount={successCount}
        totalCount={state.results.length}
      />

      <div className="space-y-3">
        {state.results.map((result) => (
          <Card className="p-4" key={result.platform}>
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle2 className="size-5 shrink-0 text-green-500" />
              ) : (
                <XCircle className="size-5 shrink-0 text-destructive" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">
                  {PLATFORM_CONFIG[result.platform]?.label ?? result.platform}
                </p>
                {result.error && (
                  <p className="line-clamp-[10] text-destructive text-xs">
                    {result.error}
                  </p>
                )}
              </div>
              {result.platformUrl && (
                <a
                  className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
                  href={result.platformUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  View
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button onClick={onReset}>Publish Another</Button>
      </div>
    </div>
  );
}
