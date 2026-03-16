import type {
  Prisma,
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

type PaginatedTopicsParams = {
  cursor?: string;
  limit?: number;
  category?: TopicCategory;
  search?: string;
  sort?: "newest" | "oldest" | "source";
};

type PaginatedTopicsResult = {
  topics: Topic[];
  nextCursor: string | null;
  totalCount: number;
};

export async function getDiscoveredTopicsPaginated({
  cursor,
  limit = 20,
  category,
  search,
  sort = "newest",
}: PaginatedTopicsParams = {}): Promise<PaginatedTopicsResult> {
  const where: Prisma.TopicWhereInput = {
    status: "DISCOVERED",
    ...(category && { category }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { summary: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const sortMap: Record<string, Prisma.TopicOrderByWithRelationInput> = {
    oldest: { discoveredAt: "asc" },
    source: { sourceName: "asc" },
    newest: { discoveredAt: "desc" },
  };
  const orderBy = sortMap[sort] ?? sortMap.newest;

  const [items, totalCount] = await Promise.all([
    prisma.topic.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),
    prisma.topic.count({ where }),
  ]);

  const hasMore = items.length > limit;
  const topics = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? (topics.at(-1)?.id ?? null) : null;

  return { topics, nextCursor, totalCount };
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

type IngestTopicData = {
  category: TopicCategory;
  rawData?: unknown;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  title: string;
};

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
