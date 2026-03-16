"use client";

import { Badge } from "@allonfire/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { cn } from "@allonfire/ui/lib/utils";
import { Bot, CircleCheck, CircleX, Minus } from "lucide-react";

type ProviderCardProps = {
  name: string;
  provider: "ANTHROPIC" | "OPENROUTER";
  isActive: boolean;
  isConfigured: boolean;
  isVerified: boolean;
  maskedKey: string | null;
  model: string | null;
  isSelected: boolean;
  onSelect: () => void;
};

function KeyStatus({
  isConfigured,
  isVerified,
}: {
  isConfigured: boolean;
  isVerified: boolean;
}) {
  if (!isConfigured) {
    return (
      <>
        <Minus className="size-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Not configured</span>
      </>
    );
  }

  if (isVerified) {
    return (
      <>
        <CircleCheck className="size-3.5 text-green-500" />
        <span className="text-muted-foreground">Key verified</span>
      </>
    );
  }

  return (
    <>
      <CircleX className="size-3.5 text-amber-500" />
      <span className="text-muted-foreground">Key unverified</span>
    </>
  );
}

export function ProviderCard({
  name,
  isActive,
  isConfigured,
  isVerified,
  maskedKey,
  model,
  isSelected,
  onSelect,
}: ProviderCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors",
        isSelected && "ring-2 ring-primary",
        isActive && "border-primary/50 bg-primary/5"
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">{name}</CardTitle>
          </div>
          <div className="flex gap-1.5">
            {isActive && <Badge>Active</Badge>}
            {!isActive && isConfigured && (
              <Badge variant="secondary">Configured</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <KeyStatus isConfigured={isConfigured} isVerified={isVerified} />
        </div>
        {model && (
          <p className="truncate text-muted-foreground text-xs">
            Model: {model}
          </p>
        )}
        {maskedKey && (
          <p className="font-mono text-muted-foreground text-xs">{maskedKey}</p>
        )}
      </CardContent>
    </Card>
  );
}
