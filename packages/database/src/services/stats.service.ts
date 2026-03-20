import { prisma } from "../index";

export async function getTopicStats() {
  const [topicsByStatus, promptsByRating, totalCount, promptCount, notesCount] =
    await Promise.all([
      prisma.topic.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.prompt.groupBy({
        by: ["rating"],
        _count: true,
      }),
      prisma.topic.count(),
      prisma.prompt.count(),
      prisma.prompt.count({ where: { ratingNote: { not: null } } }),
    ]);

  const statusCount = (status: string) =>
    topicsByStatus.find((g) => g.status === status)?._count ?? 0;
  const ratingCount = (rating: string) =>
    promptsByRating.find((g) => g.rating === rating)?._count ?? 0;

  return {
    discoveredCount: statusCount("DISCOVERED"),
    aiPickedCount: statusCount("AI_PICKED"),
    selectedCount: statusCount("SELECTED"),
    totalCount,
    promptCount,
    positivePromptCount: ratingCount("POSITIVE"),
    negativePromptCount: ratingCount("NEGATIVE"),
    notesCount,
  };
}

export async function getRecentPosts(limit = 5) {
  return await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { topic: true },
  });
}

export async function getDailySummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [newTopics, generatedPosts, publishedToday] = await Promise.all([
    prisma.topic.count({
      where: { discoveredAt: { gte: today } },
    }),
    prisma.post.count({
      where: { createdAt: { gte: today } },
    }),
    prisma.post.count({
      where: { publishedAt: { gte: today } },
    }),
  ]);

  return { newTopics, generatedPosts, publishedToday };
}
