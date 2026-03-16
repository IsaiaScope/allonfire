"use client";

import {
  ANTHROPIC_MODELS,
  DEFAULT_MODELS,
  OPENROUTER_MODELS,
} from "@allonfire/content-generator/providers/models";
import { AlertTriangle, CircleCheck } from "lucide-react";
import { useState } from "react";
import { ProviderCard } from "./provider-card";
import { ProviderConfigPanel } from "./provider-config-panel";

type ProviderData = {
  id: string;
  provider: "ANTHROPIC" | "OPENROUTER";
  maskedKey: string;
  model: string;
  isVerified: boolean;
};

type ProvidersHubProps = {
  providers: ProviderData[];
  activeProviderId: string | null;
  activeProvider: { name: string; model: string } | null;
};

const PROVIDER_META = {
  ANTHROPIC: {
    name: "Anthropic",
    models: ANTHROPIC_MODELS,
    defaultModel: DEFAULT_MODELS.ANTHROPIC,
  },
  OPENROUTER: {
    name: "OpenRouter",
    models: OPENROUTER_MODELS,
    defaultModel: DEFAULT_MODELS.OPENROUTER,
  },
} as const;

const PROVIDER_TYPES = ["ANTHROPIC", "OPENROUTER"] as const;

export function ProvidersHub({
  providers,
  activeProviderId,
  activeProvider,
}: ProvidersHubProps) {
  const [selected, setSelected] = useState<"ANTHROPIC" | "OPENROUTER" | null>(
    null
  );

  const providerMap = new Map(providers.map((p) => [p.provider, p]));

  return (
    <div className="max-w-2xl space-y-6">
      {activeProvider ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3">
          <CircleCheck className="size-4 text-green-600" />
          <p className="text-sm">
            Currently generating with{" "}
            <span className="font-medium">
              {PROVIDER_META[activeProvider.name as keyof typeof PROVIDER_META]
                ?.name ?? activeProvider.name}
            </span>{" "}
            using{" "}
            <span className="font-mono text-xs">{activeProvider.model}</span>
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="size-4 text-amber-600" />
          <p className="text-sm">
            No AI provider configured — content generation is disabled.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {PROVIDER_TYPES.map((type) => {
          const meta = PROVIDER_META[type];
          const data = providerMap.get(type);

          return (
            <ProviderCard
              isActive={data?.id === activeProviderId}
              isConfigured={Boolean(data)}
              isSelected={selected === type}
              isVerified={data?.isVerified ?? false}
              key={type}
              maskedKey={data?.maskedKey ?? null}
              model={data?.model ?? null}
              name={meta.name}
              onSelect={() => setSelected(selected === type ? null : type)}
              provider={type}
            />
          );
        })}
      </div>

      {selected && (
        <ProviderConfigPanel
          defaultModel={PROVIDER_META[selected].defaultModel}
          existingId={providerMap.get(selected)?.id ?? null}
          existingModel={providerMap.get(selected)?.model ?? null}
          isActive={providerMap.get(selected)?.id === activeProviderId}
          isVerified={providerMap.get(selected)?.isVerified ?? false}
          maskedKey={providerMap.get(selected)?.maskedKey ?? null}
          models={PROVIDER_META[selected].models}
          name={PROVIDER_META[selected].name}
          onClose={() => setSelected(null)}
          provider={selected}
        />
      )}
    </div>
  );
}
