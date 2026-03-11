import { prisma } from "../index";

export async function getDrafts() {
  return await prisma.post.findMany({
    where: { status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    include: { topic: true },
  });
}

export async function getScheduledPosts() {
  return await prisma.post.findMany({
    where: { status: "SCHEDULED" },
    orderBy: { scheduledAt: "asc" },
    include: { topic: true },
  });
}

export async function getDueScheduledPosts() {
  return await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    include: { topic: true },
  });
}

export async function getPostById(postId: string) {
  return await prisma.post.findUnique({
    where: { id: postId },
    include: { topic: true },
  });
}

export async function approvePost(postId: string) {
  return await prisma.post.update({
    where: { id: postId },
    data: { status: "APPROVED" },
  });
}

export async function rejectPost(postId: string) {
  return await prisma.post.delete({
    where: { id: postId },
  });
}

export async function schedulePost(postId: string, scheduledAt: Date) {
  return await prisma.post.update({
    where: { id: postId },
    data: { status: "SCHEDULED", scheduledAt },
  });
}

export async function unschedulePost(postId: string) {
  return await prisma.post.update({
    where: { id: postId },
    data: { status: "APPROVED", scheduledAt: null },
  });
}

export async function updatePostContent(postId: string, content: string) {
  return await prisma.post.update({
    where: { id: postId },
    data: { content },
  });
}

export async function markPublished(postId: string, platformPostId?: string) {
  return await prisma.post.update({
    where: { id: postId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      platformPostId: platformPostId ?? null,
    },
  });
}

export async function markFailed(postId: string, errorMessage: string) {
  return await prisma.post.update({
    where: { id: postId },
    data: { status: "FAILED", errorMessage },
  });
}
