"use server";

import { deletePrompt } from "@allonfire/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/server-auth";

const idSchema = z.cuid2();

export async function deletePromptAction(promptId: string) {
  await requireAuth();
  const id = idSchema.parse(promptId);
  try {
    await deletePrompt(id);
    revalidatePath("/generate");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
