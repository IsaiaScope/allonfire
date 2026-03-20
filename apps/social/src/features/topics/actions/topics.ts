"use server";

import {
  deleteAllTopics,
  deleteSelectedTopics,
  deleteTopic,
  selectTopic as selectTopicService,
} from "@allonfire/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/server-auth";

const idSchema = z.cuid2();

export async function selectTopicAction(topicId: string) {
  await requireAuth();
  const id = idSchema.parse(topicId);
  try {
    await selectTopicService(id);
    revalidatePath("/discover");
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

export async function deleteTopicAction(topicId: string) {
  await requireAuth();
  const id = idSchema.parse(topicId);
  try {
    await deleteTopic(id);
    revalidatePath("/discover");
    revalidatePath("/generate");
    revalidatePath("/");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

const selectedFiltersSchema = z.object({
  hasNotes: z.boolean().optional(),
  rating: z.enum(["POSITIVE", "NEGATIVE"]).optional(),
});

export async function deleteAllSelectedTopicsAction(filters?: {
  hasNotes?: boolean;
  rating?: "POSITIVE" | "NEGATIVE";
}) {
  await requireAuth();
  const validated = selectedFiltersSchema.parse(filters ?? {});
  try {
    const count = await deleteSelectedTopics(validated);
    revalidatePath("/generate");
    revalidatePath("/");
    return { count, success: true as const };
  } catch (error) {
    return {
      count: 0,
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

const categorySchema = z
  .enum(["NEWS", "MEME_WORTHY", "LEARNING", "TOOL_RELEASE", "AI_UPDATE"])
  .optional();

export async function deleteAllTopicsAction(category?: string) {
  await requireAuth();
  const validCategory = categorySchema.parse(category || undefined);
  try {
    const count = await deleteAllTopics(validCategory, "AI_PICKED");
    revalidatePath("/discover");
    revalidatePath("/");
    return { count, success: true as const };
  } catch (error) {
    return {
      count: 0,
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
