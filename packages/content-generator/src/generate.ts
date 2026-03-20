import { createPrompt, prisma } from "@allonfire/database";
import { extractArticle } from "./extract-article";
import { metaPrompt } from "./prompts/meta-prompt";
import { getActiveProviderClient } from "./providers";

export type TopicInput = {
  title: string;
  summary: string;
  sourceUrl: string;
  articleContent?: string;
};

export async function generatePromptForTopic(topicId: string): Promise<void> {
  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: topicId },
  });

  const rawData = (topic.rawData ?? {}) as Record<string, unknown>;
  const cachedArticle = rawData.articleContent as string | undefined;

  // Fetch provider and extract article in parallel (independent I/O)
  const [provider, articleContent] = await Promise.all([
    getActiveProviderClient(),
    cachedArticle
      ? Promise.resolve(cachedArticle)
      : (async () => {
          if (!topic.sourceUrl) {
            return undefined;
          }
          const article = await extractArticle(topic.sourceUrl);
          if (article) {
            // Cache for future generations
            await prisma.topic.update({
              where: { id: topicId },
              data: {
                rawData: { ...rawData, articleContent: article.text },
              },
            });
            return article.text;
          }
          return undefined;
        })(),
  ]);

  const prompt = metaPrompt({
    title: topic.title,
    summary: topic.summary,
    sourceUrl: topic.sourceUrl,
    category: topic.category,
    articleContent,
  });

  const response = await provider.client.generate({
    model: provider.model,
    maxTokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  await createPrompt(topicId, response.text);
}
