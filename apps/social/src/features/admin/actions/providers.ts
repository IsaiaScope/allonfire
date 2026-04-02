"use server";

import {
  deleteProvider as deleteProviderService,
  getProviderWithDecryptedKey,
  setActiveProvider as setActiveProviderService,
  upsertProvider,
} from "@allonfire/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/server-auth";

export type ProviderType =
  | "ANTHROPIC"
  | "OPENROUTER"
  | "GOOGLE_GEMINI"
  | "GROQ";

const providerSchema = z.object({
  provider: z.enum(["ANTHROPIC", "OPENROUTER", "GOOGLE_GEMINI", "GROQ"]),
  apiKey: z.string().optional(),
  model: z.string(),
});

async function createProviderClient(type: ProviderType, apiKey: string) {
  switch (type) {
    case "ANTHROPIC": {
      const { createAnthropicProvider } = await import(
        "@allonfire/content-generator/providers/anthropic"
      );
      return createAnthropicProvider(apiKey);
    }
    case "OPENROUTER": {
      const { createOpenRouterProvider } = await import(
        "@allonfire/content-generator/providers/openrouter"
      );
      return createOpenRouterProvider(apiKey);
    }
    case "GOOGLE_GEMINI": {
      const { createGeminiProvider } = await import(
        "@allonfire/content-generator/providers/gemini"
      );
      return createGeminiProvider(apiKey);
    }
    case "GROQ": {
      const { createGroqProvider } = await import(
        "@allonfire/content-generator/providers/groq"
      );
      return createGroqProvider(apiKey);
    }
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown provider type: ${_exhaustive}`);
    }
  }
}

export async function saveProviderAction(data: {
  provider: ProviderType;
  apiKey?: string;
  model: string;
}) {
  await requireAdmin();
  const parsed = providerSchema.parse(data);

  // If a new API key is provided, validate it and save
  if (parsed.apiKey) {
    const client = await createProviderClient(parsed.provider, parsed.apiKey);

    try {
      await client.validate();
    } catch (error) {
      return {
        success: false as const,
        error:
          error instanceof Error ? error.message : "Failed to validate API key",
      };
    }

    await upsertProvider({
      provider: parsed.provider,
      apiKey: parsed.apiKey,
      model: parsed.model,
      isVerified: true,
    });

    revalidatePath("/admin/providers");
    return { success: true as const };
  }

  // No new key — update model only using existing key from DB
  const existing = await getProviderWithDecryptedKey(parsed.provider);
  if (!existing) {
    return {
      success: false as const,
      error: "No existing API key found. Please provide one.",
    };
  }

  await upsertProvider({
    provider: parsed.provider,
    apiKey: existing.apiKey,
    model: parsed.model,
    isVerified: existing.isVerified,
  });

  revalidatePath("/admin/providers");
  return { success: true as const };
}

export async function setActiveProviderAction(providerId: string) {
  await requireAdmin();
  try {
    await setActiveProviderService(providerId);
    revalidatePath("/admin/providers");
    revalidatePath("/publish");
    revalidatePath("/settings/general");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function testConnectionAction(
  provider: ProviderType,
  apiKey?: string
) {
  await requireAdmin();

  let key = apiKey;
  if (!key) {
    const record = await getProviderWithDecryptedKey(provider);
    if (!record) {
      return { success: false as const, error: "Provider not configured" };
    }
    key = record.apiKey;
  }

  const client = await createProviderClient(provider, key);

  try {
    await client.validate();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Connection test failed",
    };
  }
}

export async function revealApiKeyAction(provider: ProviderType) {
  await requireAdmin();
  try {
    const record = await getProviderWithDecryptedKey(provider);
    if (!record) {
      return { success: false as const, error: "Provider not configured" };
    }
    return { success: true as const, apiKey: record.apiKey };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export async function listModelsAction(
  provider: ProviderType,
  apiKey?: string
) {
  await requireAdmin();

  let key = apiKey;
  if (!key) {
    const record = await getProviderWithDecryptedKey(provider);
    if (!record) {
      return { success: false as const, error: "No key configured" };
    }
    key = record.apiKey;
  }

  const client = await createProviderClient(provider, key);

  try {
    const models = await client.listModels();
    const modelsByLabel = new Map<string, (typeof models)[number]>();
    for (const m of models) {
      const existing = modelsByLabel.get(m.label);
      if (!existing || (m.version ?? "") > (existing.version ?? "")) {
        modelsByLabel.set(m.label, m);
      }
    }
    const unique = Array.from(modelsByLabel.values());
    return { success: true as const, models: unique };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch models",
    };
  }
}

export async function deleteProviderAction(providerId: string) {
  await requireAdmin();

  try {
    await deleteProviderService(providerId);
    revalidatePath("/admin/providers");
    revalidatePath("/publish");
    revalidatePath("/settings/general");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to delete provider",
    };
  }
}
