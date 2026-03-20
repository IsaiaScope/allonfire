import type {
  PostType,
  PromptRating,
  TopicCategory,
} from "../../generated/prisma/client";
import { prisma } from "../index";

export async function createPrompt(
  topicId: string,
  content: string,
  postType?: PostType
) {
  return await prisma.prompt.create({
    data: {
      topicId,
      content,
      postType,
    },
  });
}

export async function getPromptsByTopicId(topicId: string) {
  return await prisma.prompt.findMany({
    where: { topicId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPromptCount() {
  return await prisma.prompt.count();
}

export async function deletePrompt(promptId: string) {
  return await prisma.prompt.delete({
    where: { id: promptId },
  });
}

export async function ratePrompt(
  promptId: string,
  rating: PromptRating,
  note?: string
) {
  return await prisma.prompt.update({
    where: { id: promptId },
    data: {
      rating,
      ratingNote: note ?? null,
      ratedAt: new Date(),
    },
  });
}

export async function updatePromptNote(promptId: string, note: string | null) {
  return await prisma.prompt.update({
    where: { id: promptId },
    data: { ratingNote: note },
  });
}

export async function getPositivePromptsByCategory(
  category: TopicCategory,
  limit = 2
) {
  return await prisma.prompt.findMany({
    where: {
      rating: "POSITIVE",
      topic: { category },
    },
    orderBy: { ratedAt: "desc" },
    take: limit,
    select: {
      content: true,
      topic: { select: { title: true, category: true } },
    },
  });
}

export async function getPromptRatingStats() {
  const results = await prisma.$queryRaw<
    Array<{ category: string; rating: string; count: bigint }>
  >`
    SELECT t."category", p."rating", COUNT(*)::bigint as count
    FROM "Prompt" p
    JOIN "Topic" t ON p."topicId" = t."id"
    WHERE p."rating" IS NOT NULL
    GROUP BY t."category", p."rating"
    ORDER BY t."category", p."rating"
  `;

  return results.map((r) => ({
    category: r.category,
    rating: r.rating,
    count: Number(r.count),
  }));
}
