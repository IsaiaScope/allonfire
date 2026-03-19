import { type Platform, type PostType, prisma } from "@allonfire/database";
import { extractArticle } from "./extract-article";
import { learningPrompt } from "./prompts/learning";
import { memePrompt } from "./prompts/meme";
import { newsPrompt } from "./prompts/news";
import { getActiveProviderClient } from "./providers";

const PLATFORMS: Platform[] = ["LINKEDIN", "TWITTER", "YOUTUBE", "TIKTOK"];

export type TopicInput = {
  title: string;
  summary: string;
  sourceUrl: string;
  articleContent?: string;
};

function getPrompt(
  topic: TopicInput,
  type: PostType,
  platform: Platform
): string {
  switch (type) {
    case "MEME":
      return memePrompt(topic, platform);
    case "NEWS":
      return newsPrompt(topic, platform);
    case "LEARNING":
      return learningPrompt(topic, platform);
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown post type: ${_exhaustive}`);
    }
  }
}

function inferPostType(category: string): PostType {
  switch (category) {
    case "MEME_WORTHY":
      return "MEME";
    case "LEARNING":
    case "TOOL_RELEASE":
      return "LEARNING";
    default:
      return "NEWS";
  }
}

async function generateForPlatform(
  topic: TopicInput & { category: string },
  platform: Platform,
  provider: Awaited<ReturnType<typeof getActiveProviderClient>>
): Promise<string> {
  const type = inferPostType(topic.category);
  const prompt = getPrompt(topic, type, platform);

  const response = await provider.client.generate({
    model: provider.model,
    maxTokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return response.text;
}

export async function generatePostsForTopic(topicId: string): Promise<void> {
  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: topicId },
  });

  const provider = await getActiveProviderClient();

  // Try to fetch article content for richer generation
  const rawData = (topic.rawData ?? {}) as Record<string, unknown>;
  let articleContent = rawData.articleContent as string | undefined;

  if (!articleContent && topic.sourceUrl) {
    const article = await extractArticle(topic.sourceUrl);
    if (article) {
      articleContent = article.text;
      // Cache for future generations
      await prisma.topic.update({
        where: { id: topicId },
        data: {
          rawData: { ...rawData, articleContent: article.text },
        },
      });
    }
  }

  const topicInput = { ...topic, articleContent };
  const type = inferPostType(topic.category);

  for (const platform of PLATFORMS) {
    try {
      const content = await generateForPlatform(topicInput, platform, provider);

      await prisma.post.create({
        data: {
          topicId,
          type,
          platform,
          status: "DRAFT",
          content,
        },
      });

      console.log(`Generated ${platform} post for: ${topic.title}`);
    } catch (error) {
      console.error(`Failed to generate ${platform} post:`, error);

      await prisma.post.create({
        data: {
          topicId,
          type,
          platform,
          status: "FAILED",
          content: "",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
