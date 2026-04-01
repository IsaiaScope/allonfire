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
