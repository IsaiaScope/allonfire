import type {
  Topic,
  TopicCategory,
  TopicStatus,
} from "../../generated/prisma/client";
import { prisma } from "../index";

export async function getDiscoveredTopics(limit = 50) {
  return await prisma.topic.findMany({
    where: { status: "DISCOVERED" },
    orderBy: { discoveredAt: "desc" },
    take: limit,
  });
}

export async function getTopicsByStatus(statuses: TopicStatus[], limit = 50) {
  return await prisma.topic.findMany({
    where: { status: { in: statuses } },
    orderBy: { discoveredAt: "desc" },
    take: limit,
  });
}

export async function getTopicsByStatusWithPosts(
  statuses: TopicStatus[],
  limit = 50
) {
  return await prisma.topic.findMany({
    where: { status: { in: statuses } },
    orderBy: { discoveredAt: "desc" },
    take: limit,
    include: { posts: true },
  });
}

export async function selectTopic(topicId: string) {
  return await prisma.topic.update({
    where: { id: topicId },
    data: { status: "SELECTED" },
  });
}

export async function selectTopics(topicIds: string[]) {
  return await prisma.topic.updateMany({
    where: { id: { in: topicIds } },
    data: { status: "SELECTED" },
  });
}

export async function archiveTopic(topicId: string) {
  return await prisma.topic.update({
    where: { id: topicId },
    data: { status: "ARCHIVED" },
  });
}

interface IngestTopicData {
  category: TopicCategory;
  rawData?: unknown;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  title: string;
}

export async function ingestTopics(topics: IngestTopicData[]) {
  const results: Topic[] = [];
  for (const topic of topics) {
    const existing = await prisma.topic.findFirst({
      where: { sourceUrl: topic.sourceUrl },
    });
    if (existing) {
      continue;
    }

    const created = await prisma.topic.create({
      data: {
        title: topic.title,
        summary: topic.summary,
        sourceUrl: topic.sourceUrl,
        sourceName: topic.sourceName,
        category: topic.category,
        rawData: topic.rawData as never,
      },
    });
    results.push(created);
  }
  return results;
}
