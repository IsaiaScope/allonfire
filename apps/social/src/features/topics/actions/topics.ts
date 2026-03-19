"use server";

import {
  deleteAllTopics,
  deleteTopic,
  selectTopic as selectTopicService,
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

const idSchema = z.string().cuid2();

export async function selectTopicAction(topicId: string) {
  await requireAuth();
  const id = idSchema.parse(topicId);
  await selectTopicService(id);
  revalidatePath("/discover");
  revalidatePath("/generate");
  return { success: true };
}

export async function deleteTopicAction(topicId: string) {
  await requireAuth();
  const id = idSchema.parse(topicId);
  await deleteTopic(id);
  revalidatePath("/discover");
  revalidatePath("/generate");
  revalidatePath("/");
  return { success: true };
}

const categorySchema = z
  .enum(["NEWS", "MEME_WORTHY", "LEARNING", "TOOL_RELEASE", "AI_UPDATE"])
  .optional();

export async function deleteAllTopicsAction(category?: string) {
  await requireAuth();
  const validCategory = categorySchema.parse(category || undefined);
  const count = await deleteAllTopics(validCategory, "AI_PICKED");
  revalidatePath("/discover");
  revalidatePath("/");
  return { count, success: true };
}
