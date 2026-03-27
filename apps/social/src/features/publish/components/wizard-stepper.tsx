"use client";

import { cn } from "@allonfire/ui/lib/utils";
import { Check } from "lucide-react";
import type { WizardStep } from "../types/publish-types";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "compose", label: "Compose" },
  { key: "platforms", label: "Platforms" },
  { key: "preview", label: "Preview" },
  { key: "confirm", label: "Confirm" },
  { key: "results", label: "Results" },
];

const STEP_ORDER: WizardStep[] = STEPS.map((s) => s.key);

function getStepIndex(step: WizardStep): number {
  return STEP_ORDER.indexOf(step);
}

type WizardStepperProps = {
  currentStep: WizardStep;
};

export function WizardStepper({ currentStep }: WizardStepperProps) {
  const currentIndex = getStepIndex(currentStep);
  const currentLabel = STEPS[currentIndex]?.label ?? "";

  return (
    <div className="overflow-hidden">
      {/* Mobile: compact step indicator */}
      <div className="flex flex-col items-center gap-2 md:hidden">
        <p className="font-medium text-sm">
          Step {currentIndex + 1} of {STEPS.length} —{" "}
          <span className="text-primary">{currentLabel}</span>
        </p>
        <div className="flex items-center gap-1.5">
          {STEPS.map((step, index) => (
            <div
              className={cn(
                "size-2 rounded-full transition-colors",
                index < currentIndex && "bg-primary",
                index === currentIndex && "size-2.5 bg-primary",
                index > currentIndex && "bg-muted-foreground/30"
              )}
              key={step.key}
            />
          ))}
        </div>
      </div>

      {/* Desktop: horizontal stepper */}
      <div className="mx-auto hidden max-w-2xl items-center justify-between gap-2 pb-2 md:flex">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <div className="flex flex-1 items-center gap-2" key={step.key}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 font-medium text-xs transition-colors",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isActive && "border-primary bg-primary/10 text-primary",
                    !(isCompleted || isActive) &&
                      "border-muted-foreground/30 text-muted-foreground/50"
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : index + 1}
                </div>
                <span
                  className={cn(
                    "text-center text-xs",
                    isActive && "font-medium text-foreground",
                    isCompleted && "text-primary",
                    !(isCompleted || isActive) && "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mb-5 h-0.5 flex-1",
                    index < currentIndex
                      ? "bg-primary"
                      : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
