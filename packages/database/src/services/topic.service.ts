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
  totalCount: number | null;
};

export async function getDiscoveredTopicsPaginated({
  cursor,
  limit = 20,
  category,
  search,
  sort = "newest",
}: PaginatedTopicsParams = {}): Promise<PaginatedTopicsResult> {
  const where: Prisma.TopicWhereInput = {
    status: "AI_PICKED",
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

  const isFirstPage = !cursor;

  const [items, totalCount] = await Promise.all([
    prisma.topic.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),
    isFirstPage ? prisma.topic.count({ where }) : Promise.resolve(null),
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

export async function getTopicWithPrompts(topicId: string) {
  return await prisma.topic.findUnique({
    where: { id: topicId },
    include: { prompts: { orderBy: { createdAt: "desc" } } },
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

type IngestTopicData = {
  category: TopicCategory;
  rawData?: unknown;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  title: string;
};

export async function deleteTopic(topicId: string): Promise<void> {
  await prisma.$transaction([
    prisma.post.updateMany({
      where: { topicId },
      data: { topicId: null },
    }),
    prisma.topic.delete({ where: { id: topicId } }),
  ]);
}

export async function deleteAllTopics(
  category?: TopicCategory,
  status?: TopicStatus
): Promise<number> {
  const where: Prisma.TopicWhereInput = {
    ...(status && { status }),
    ...(category && { category }),
  };

  const [, deleteResult] = await prisma.$transaction([
    prisma.post.updateMany({
      where: { topic: where },
      data: { topicId: null },
    }),
    prisma.topic.deleteMany({ where }),
  ]);
  return deleteResult.count;
}

type SelectedTopicsParams = {
  cursor?: string;
  hasNotes?: boolean;
  limit?: number;
  rating?: "POSITIVE" | "NEGATIVE";
  search?: string;
};

type SelectedTopicsResult = {
  topics: (Topic & {
    prompts: { id: string; rating: string | null; ratingNote: string | null }[];
  })[];
  nextCursor: string | null;
  totalCount: number | null;
};

export async function getSelectedTopicsPaginated({
  cursor,
  limit = 20,
  rating,
  hasNotes,
  search,
}: SelectedTopicsParams = {}): Promise<SelectedTopicsResult> {
  const where: Prisma.TopicWhereInput = {
    status: "SELECTED",
    ...(rating && {
      prompts: { some: { rating } },
    }),
    ...(hasNotes && {
      prompts: { some: { ratingNote: { not: null } } },
    }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { summary: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const isFirstPage = !cursor;

  const [items, totalCount] = await Promise.all([
    prisma.topic.findMany({
      where,
      orderBy: { discoveredAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        prompts: {
          orderBy: { createdAt: "desc" },
          select: { id: true, rating: true, ratingNote: true },
        },
      },
    }),
    isFirstPage ? prisma.topic.count({ where }) : Promise.resolve(null),
  ]);

  const hasMore = items.length > limit;
  const topics = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? (topics.at(-1)?.id ?? null) : null;

  return { topics, nextCursor, totalCount };
}

export async function deleteSelectedTopics(filters?: {
  hasNotes?: boolean;
  rating?: "POSITIVE" | "NEGATIVE";
}): Promise<number> {
  const where: Prisma.TopicWhereInput = {
    status: "SELECTED",
    ...(filters?.rating && {
      prompts: { some: { rating: filters.rating } },
    }),
    ...(filters?.hasNotes && {
      prompts: { some: { ratingNote: { not: null } } },
    }),
  };

  const [, deleteResult] = await prisma.$transaction([
    prisma.post.updateMany({
      where: { topic: where },
      data: { topicId: null },
    }),
    prisma.topic.deleteMany({ where }),
  ]);
  return deleteResult.count;
}

export async function ingestTopics(topics: IngestTopicData[]) {
  const urls = topics.map((t) => t.sourceUrl);
  const existing = await prisma.topic.findMany({
    where: { sourceUrl: { in: urls } },
    select: { sourceUrl: true },
  });
  const existingUrls = new Set(existing.map((t) => t.sourceUrl));

  const newTopics = topics.filter((t) => !existingUrls.has(t.sourceUrl));
  if (newTopics.length === 0) {
    return [];
  }

  const results: Topic[] = [];
  for (const topic of newTopics) {
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
