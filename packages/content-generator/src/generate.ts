import type { PostType, TopicCategory } from "@allonfire/database";
import {
  createPrompt,
  getPositivePromptsByCategory,
  prisma,
} from "@allonfire/database";
import { extractArticle } from "./extract-article";
import { metaPrompt } from "./prompts/meta-prompt";
import { getActiveProviderClient } from "./providers";

export type TopicInput = {
  title: string;
  summary: string;
  sourceUrl: string;
  articleContent?: string;
};

const CATEGORY_TO_POST_TYPE: Partial<Record<TopicCategory, PostType>> = {
  MEME_WORTHY: "MEME",
  NEWS: "NEWS",
  AI_UPDATE: "NEWS",
  LEARNING: "LEARNING",
  TOOL_RELEASE: "LEARNING",
};

export async function generatePromptForTopic(topicId: string): Promise<void> {
  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: topicId },
  });

  const postType: PostType = CATEGORY_TO_POST_TYPE[topic.category] ?? "NEWS";

  const rawData = (topic.rawData ?? {}) as Record<string, unknown>;
  const cachedArticle = rawData.articleContent as string | undefined;

  // Fetch provider, extract article, and load few-shot examples in parallel
  const [provider, articleContent, fewShotExamples] = await Promise.all([
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
    getPositivePromptsByCategory(topic.category, 2).then((prompts) =>
      prompts.map((p) => ({ title: p.topic.title, content: p.content }))
    ),
  ]);

  const prompt = metaPrompt({
    title: topic.title,
    summary: topic.summary,
    sourceUrl: topic.sourceUrl,
    category: topic.category,
    postType,
    articleContent,
    fewShotExamples,
  });

  const response = await provider.client.generate({
    model: provider.model,
    maxTokens: 6144,
    messages: [{ role: "user", content: prompt }],
  });

  await createPrompt(topicId, response.text, postType);
}
