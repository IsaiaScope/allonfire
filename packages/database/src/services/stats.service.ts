import { prisma } from "../index";

export async function getTopicStats() {
  const [
    discoveredCount,
    aiPickedCount,
    selectedCount,
    totalCount,
    promptCount,
  ] = await Promise.all([
    prisma.topic.count({ where: { status: "DISCOVERED" } }),
    prisma.topic.count({ where: { status: "AI_PICKED" } }),
    prisma.topic.count({ where: { status: "SELECTED" } }),
    prisma.topic.count(),
    prisma.prompt.count(),
  ]);

  return {
    discoveredCount,
    aiPickedCount,
    selectedCount,
    totalCount,
    promptCount,
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
