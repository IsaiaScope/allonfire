import { prisma } from "../index";

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
