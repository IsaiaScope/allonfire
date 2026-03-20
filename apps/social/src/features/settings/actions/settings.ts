"use server";

import { updateSettings as updateSettingsService } from "@allonfire/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/server-auth";

const settingsSchema = z.object({
  webhookDiscoveryUrl: z.url().nullish(),
  webhookPublishUrl: z.url().nullish(),
  webhookNotifyUrl: z.url().nullish(),
});

export async function updateSettingsAction(data: {
  webhookDiscoveryUrl?: string | null;
  webhookPublishUrl?: string | null;
  webhookNotifyUrl?: string | null;
}) {
  await requireAuth();
  const parsed = settingsSchema.parse(data);
  try {
    await updateSettingsService(parsed);
    revalidatePath("/settings");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
