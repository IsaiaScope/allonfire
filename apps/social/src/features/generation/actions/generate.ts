"use server";

import { generatePromptForTopic } from "@allonfire/content-generator";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireAuth } from "@/lib/server-auth";

export async function triggerGenerationAction(
  topicId: string
): Promise<ActionResult> {
  await requireAuth();
  const id = z.cuid2().parse(topicId);

  try {
    await generatePromptForTopic(id);
    revalidatePath("/generate");
    revalidatePath("/");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Generation failed",
    };
  }
}
