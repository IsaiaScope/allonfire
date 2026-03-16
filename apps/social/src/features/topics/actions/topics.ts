"use server";

import {
  archiveTopic as archiveTopicService,
  selectTopic as selectTopicService,
  selectTopics as selectTopicsService,
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

const idSchema = z.string().cuid();
const idsSchema = z.array(z.string().cuid()).min(1);

export async function selectTopicAction(topicId: string) {
  await requireAuth();
  const id = idSchema.parse(topicId);
  await selectTopicService(id);
  revalidatePath("/discover");
  revalidatePath("/generate");
  return { success: true };
}

export async function bulkSelectTopicsAction(topicIds: string[]) {
  await requireAuth();
  const ids = idsSchema.parse(topicIds);
  await selectTopicsService(ids);
  revalidatePath("/discover");
  revalidatePath("/generate");
  return { success: true };
}

export async function archiveTopicAction(topicId: string) {
  await requireAuth();
  const id = idSchema.parse(topicId);
  await archiveTopicService(id);
  revalidatePath("/discover");
  return { success: true };
}
