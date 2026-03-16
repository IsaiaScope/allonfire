import { type Platform, type PostType, prisma } from "@allonfire/database";
import { learningPrompt } from "./prompts/learning";
import { memePrompt } from "./prompts/meme";
import { newsPrompt } from "./prompts/news";
import { getActiveProviderClient } from "./providers";

const PLATFORMS: Platform[] = ["LINKEDIN", "TWITTER", "YOUTUBE", "TIKTOK"];

function getPrompt(
  topic: { title: string; summary: string; sourceUrl: string },
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
  topic: {
    title: string;
    summary: string;
    sourceUrl: string;
    category: string;
  },
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

  await prisma.topic.update({
    where: { id: topicId },
    data: { status: "GENERATING" },
  });

  const type = inferPostType(topic.category);

  for (const platform of PLATFORMS) {
    try {
      const content = await generateForPlatform(topic, platform, provider);

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

  await prisma.topic.update({
    where: { id: topicId },
    data: { status: "GENERATED" },
  });
}
