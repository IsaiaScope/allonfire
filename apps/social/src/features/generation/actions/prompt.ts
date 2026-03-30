"use server";

import type { PromptRating } from "@allonfire/database";
import {
  deletePrompt,
  ratePrompt,
  updatePromptNote,
} from "@allonfire/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/server-auth";

const idSchema = z.cuid2();

export async function deletePromptAction(
  promptId: string
): Promise<ActionResult> {
  await requireUser();
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

const noteSchema = z.object({
  promptId: z.cuid2(),
  note: z.string().max(500),
});

export async function updateNoteAction(
  promptId: string,
  note: string
): Promise<ActionResult> {
  await requireUser();
  const parsed = noteSchema.parse({ promptId, note });
  try {
    await updatePromptNote(parsed.promptId, parsed.note || null);
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

const rateSchema = z.object({
  promptId: z.cuid2(),
  rating: z.enum(["POSITIVE", "NEGATIVE"]),
  note: z.string().max(500).optional(),
});

export async function ratePromptAction(
  promptId: string,
  rating: PromptRating,
  note?: string
): Promise<ActionResult> {
  await requireUser();
  const parsed = rateSchema.parse({ promptId, rating, note });
  try {
    await ratePrompt(parsed.promptId, parsed.rating, parsed.note);
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
