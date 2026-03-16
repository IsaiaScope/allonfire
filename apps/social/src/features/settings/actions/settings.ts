"use server";

import { updateSettings as updateSettingsService } from "@allonfire/database";
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

const settingsSchema = z.object({
  webhookDiscoveryUrl: z.string().url().nullish(),
  webhookPublishUrl: z.string().url().nullish(),
  webhookNotifyUrl: z.string().url().nullish(),
});

export async function updateSettingsAction(data: {
  webhookDiscoveryUrl?: string | null;
  webhookPublishUrl?: string | null;
  webhookNotifyUrl?: string | null;
}) {
  await requireAuth();
  const parsed = settingsSchema.parse(data);
  await updateSettingsService(parsed);
  revalidatePath("/settings");
  return { success: true };
}
