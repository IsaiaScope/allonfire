import { prisma } from "../index";

export async function createPrompt(topicId: string, content: string) {
  return await prisma.prompt.create({
    data: { topicId, content },
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
