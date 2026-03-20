"use server";

import { generatePromptForTopic } from "@allonfire/content-generator";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/server-auth";

export async function triggerGenerationAction(topicId: string) {
  await requireAuth();
  const id = z.cuid2().parse(topicId);

  try {
    await generatePromptForTopic(id);
    revalidatePath("/generate");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Generation failed",
    };
  }
}
