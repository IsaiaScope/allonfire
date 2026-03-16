"use server";

import {
  deleteProvider as deleteProviderService,
  getProviderWithDecryptedKey,
  setActiveProvider as setActiveProviderService,
  upsertProvider,
} from "@allonfire/database";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";

async function requireAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

const providerSchema = z.object({
  provider: z.enum(["ANTHROPIC", "OPENROUTER"]),
  apiKey: z.string().min(1, "API key is required"),
  model: z.string().min(1, "Model is required"),
});

export async function saveProviderAction(data: {
  provider: "ANTHROPIC" | "OPENROUTER";
  apiKey: string;
  model: string;
}) {
  await requireAuth();
  const parsed = providerSchema.parse(data);

  const { createAnthropicProvider } = await import(
    "@allonfire/content-generator/providers/anthropic"
  );
  const { createOpenRouterProvider } = await import(
    "@allonfire/content-generator/providers/openrouter"
  );

  const client =
    parsed.provider === "ANTHROPIC"
      ? createAnthropicProvider(parsed.apiKey)
      : createOpenRouterProvider(parsed.apiKey);

  try {
    await client.validate();
  } catch (error) {
    return {
      success: false,
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

  revalidatePath("/settings/providers");
  return { success: true };
}

export async function setActiveProviderAction(providerId: string) {
  await requireAuth();
  await setActiveProviderService(providerId);
  revalidatePath("/settings/providers");
  return { success: true };
}

export async function testConnectionAction(
  provider: "ANTHROPIC" | "OPENROUTER"
) {
  await requireAuth();

  const record = await getProviderWithDecryptedKey(provider);
  if (!record) {
    return { success: false, error: "Provider not configured" };
  }

  const { createAnthropicProvider } = await import(
    "@allonfire/content-generator/providers/anthropic"
  );
  const { createOpenRouterProvider } = await import(
    "@allonfire/content-generator/providers/openrouter"
  );

  const client =
    provider === "ANTHROPIC"
      ? createAnthropicProvider(record.apiKey)
      : createOpenRouterProvider(record.apiKey);

  try {
    await client.validate();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection test failed",
    };
  }
}

export async function deleteProviderAction(providerId: string) {
  await requireAuth();

  try {
    await deleteProviderService(providerId);
    revalidatePath("/settings/providers");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete provider",
    };
  }
}
