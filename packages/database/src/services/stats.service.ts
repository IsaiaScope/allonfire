import { prisma } from "../index";

export async function getOverviewStats() {
  const [topicCount, draftCount, scheduledCount, publishedCount] =
    await Promise.all([
      prisma.topic.count({ where: { status: "DISCOVERED" } }),
      prisma.post.count({ where: { status: "DRAFT" } }),
      prisma.post.count({ where: { status: "SCHEDULED" } }),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
    ]);

  return { topicCount, draftCount, scheduledCount, publishedCount };
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
