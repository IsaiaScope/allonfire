"use server";

import {
  approvePost as approvePostService,
  rejectPost as rejectPostService,
  schedulePost as schedulePostService,
  unschedulePost as unschedulePostService,
  updatePostContent as updatePostContentService,
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

export async function approvePostAction(postId: string) {
  await requireAuth();
  const id = idSchema.parse(postId);
  await approvePostService(id);
  revalidatePath("/drafts");
  revalidatePath("/");
  return { success: true };
}

export async function rejectPostAction(postId: string) {
  await requireAuth();
  const id = idSchema.parse(postId);
  await rejectPostService(id);
  revalidatePath("/drafts");
  revalidatePath("/");
  return { success: true };
}

export async function schedulePostAction(postId: string, scheduledAt: Date) {
  await requireAuth();
  const id = idSchema.parse(postId);
  z.date().min(new Date()).parse(scheduledAt);
  await schedulePostService(id, scheduledAt);
  revalidatePath("/drafts");
  revalidatePath("/schedule");
  revalidatePath("/");
  return { success: true };
}

export async function unschedulePostAction(postId: string) {
  await requireAuth();
  const id = idSchema.parse(postId);
  await unschedulePostService(id);
  revalidatePath("/schedule");
  revalidatePath("/");
  return { success: true };
}

export async function updatePostContentAction(postId: string, content: string) {
  await requireAuth();
  const id = idSchema.parse(postId);
  z.string().min(1).max(5000).parse(content);
  await updatePostContentService(id, content);
  revalidatePath("/drafts");
  return { success: true };
}
