import { getActiveProvider as getActiveProviderFromDB } from "@allonfire/database";
import { createAnthropicProvider } from "./anthropic";
import { createGeminiProvider } from "./gemini";
import { createGroqProvider } from "./groq";
import { createOpenRouterProvider } from "./openrouter";
import type { ProviderClient } from "./types";

export async function getActiveProviderClient(): Promise<{
  client: ProviderClient;
  model: string;
}> {
  const provider = await getActiveProviderFromDB();

  if (!provider) {
    throw new Error(
      "No AI provider configured. Set up a provider at /admin/providers."
    );
  }

  const { apiKey, model, provider: providerType } = provider;

  switch (providerType) {
    case "ANTHROPIC":
      return { client: createAnthropicProvider(apiKey), model };
    case "OPENROUTER":
      return { client: createOpenRouterProvider(apiKey), model };
    case "GOOGLE_GEMINI":
      return { client: createGeminiProvider(apiKey), model };
    case "GROQ":
      return { client: createGroqProvider(apiKey), model };
    default: {
      const _exhaustive: never = providerType;
      throw new Error(`Unknown provider type: ${_exhaustive}`);
    }
  }
}

export type {
  GenerateRequest,
  GenerateResponse,
  ProviderClient,
} from "./types";
