"use server";

import {
  approvePost as approvePostService,
  rejectPost as rejectPostService,
  schedulePost as schedulePostService,
  unschedulePost as unschedulePostService,
  updatePostContent as updatePostContentService,
} from "@allonfire/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireAuth } from "@/lib/server-auth";

const idSchema = z.cuid2();

export async function approvePostAction(postId: string): Promise<ActionResult> {
  await requireAuth();
  const id = idSchema.parse(postId);
  try {
    await approvePostService(id);
    revalidatePath("/drafts");
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

export async function rejectPostAction(postId: string): Promise<ActionResult> {
  await requireAuth();
  const id = idSchema.parse(postId);
  try {
    await rejectPostService(id);
    revalidatePath("/drafts");
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

export async function schedulePostAction(
  postId: string,
  scheduledAt: Date
): Promise<ActionResult> {
  await requireAuth();
  const id = idSchema.parse(postId);
  z.date().min(new Date()).parse(scheduledAt);
  try {
    await schedulePostService(id, scheduledAt);
    revalidatePath("/drafts");
    revalidatePath("/schedule");
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

export async function unschedulePostAction(
  postId: string
): Promise<ActionResult> {
  await requireAuth();
  const id = idSchema.parse(postId);
  try {
    await unschedulePostService(id);
    revalidatePath("/schedule");
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

export async function updatePostContentAction(
  postId: string,
  content: string
): Promise<ActionResult> {
  await requireAuth();
  const id = idSchema.parse(postId);
  z.string().min(1).max(5000).parse(content);
  try {
    await updatePostContentService(id, content);
    revalidatePath("/drafts");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
