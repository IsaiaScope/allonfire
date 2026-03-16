"use server";

import { generatePostsForTopic } from "@allonfire/content-generator";
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

export async function triggerGenerationAction(topicId: string) {
  await requireAuth();
  const id = z.string().cuid().parse(topicId);

  try {
    await generatePostsForTopic(id);
    revalidatePath("/generate");
    revalidatePath("/drafts");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Generation failed",
    };
  }
}
