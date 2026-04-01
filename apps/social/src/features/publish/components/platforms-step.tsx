"use client";

import type { Platform } from "@allonfire/database";
import { Button } from "@allonfire/ui/components/button";
import { Card } from "@allonfire/ui/components/card";
import { Switch } from "@allonfire/ui/components/switch";
import { cn } from "@allonfire/ui/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PLATFORM_CONFIG } from "../constants/platforms";
import type { usePublishWizard } from "../hooks/use-publish-wizard";
import type { ConnectedAccount } from "../types/publish-types";
import { PlatformConnect } from "./platform-connect";

type PublishWizardState = ReturnType<typeof usePublishWizard>["state"];
type PublishWizardActions = ReturnType<typeof usePublishWizard>["actions"];

const PLATFORMS = (Object.keys(PLATFORM_CONFIG) as Platform[]).map((key) => {
  const config = PLATFORM_CONFIG[key];
  return {
    key,
    label: config?.label ?? key,
    icon: config?.icon ?? key[0],
  };
});

type PlatformsStepProps = {
  state: PublishWizardState;
  actions: PublishWizardActions;
  configuredPlatforms: Platform[];
  connectedAccounts: ConnectedAccount[];
  onRefreshAccounts: () => void;
  onNext: () => void;
  onBack: () => void;
  role?: string;
};

export function PlatformsStep({
  state,
  actions,
  configuredPlatforms,
  connectedAccounts,
  onRefreshAccounts,
  onNext,
  onBack,
  role,
}: PlatformsStepProps) {
  const hasSelectedPlatforms = state.selectedPlatforms.length > 0;

  function getAccount(platform: Platform): ConnectedAccount | undefined {
    return connectedAccounts.find((a) => a.platform === platform);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {PLATFORMS.map(({ key, label, icon }) => {
          const account = getAccount(key);
          const isConnected = Boolean(account);
          const isConfigured = configuredPlatforms.includes(key);
          const isSelected = state.selectedPlatforms.includes(key);

          return (
            <Card
              className={cn(
                "p-4 transition-colors",
                isConnected && isSelected && "border-primary",
                !isConfigured && "opacity-50",
                isConnected && "cursor-pointer"
              )}
              key={key}
              onClick={(e) => {
                if (!isConnected) {
                  return;
                }
                const target = e.target as HTMLElement;
                if (
                  target.closest(
                    "button:not([role='switch']), a, [data-slot='alert-dialog']"
                  )
                ) {
                  return;
                }
                actions.togglePlatform(key);
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded bg-primary/10 font-bold text-primary">
                    {icon}
                  </span>
                  <span className="font-medium">{label}</span>
                  {isConnected && (
                    <Switch
                      checked={isSelected}
                      className="ml-auto"
                      onCheckedChange={() => actions.togglePlatform(key)}
                    />
                  )}
                </div>
                {isConfigured ? (
                  <PlatformConnect
                    isConnected={isConnected}
                    onConnected={onRefreshAccounts}
                    onDisconnected={onRefreshAccounts}
                    platform={key}
                    role={role}
                    username={account?.platformUsername}
                  />
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Not configured — add API credentials in environment
                    variables
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button className="w-full sm:w-auto" onClick={onBack} variant="ghost">
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
        <Button
          className="w-full sm:w-auto"
          disabled={!hasSelectedPlatforms}
          onClick={onNext}
        >
          Next
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </div>
    </div>
  );
}
