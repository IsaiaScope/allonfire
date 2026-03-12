import { type Platform, type PostType, prisma } from "@allonfire/database";
import Anthropic from "@anthropic-ai/sdk";
import { learningPrompt } from "./prompts/learning";
import { memePrompt } from "./prompts/meme";
import { newsPrompt } from "./prompts/news";

const PLATFORMS: Platform[] = ["LINKEDIN", "TWITTER", "YOUTUBE", "TIKTOK"];

const client = new Anthropic();

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
  platform: Platform
): Promise<string> {
  const type = inferPostType(topic.category);
  const prompt = getPrompt(topic, type, platform);

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content.at(0);
  if (!block || block.type !== "text") {
    throw new Error(`Unexpected response type: ${block?.type ?? "empty"}`);
  }
  return block.text;
}

export async function generatePostsForTopic(topicId: string): Promise<void> {
  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: topicId },
  });

  await prisma.topic.update({
    where: { id: topicId },
    data: { status: "GENERATING" },
  });

  const type = inferPostType(topic.category);

  for (const platform of PLATFORMS) {
    try {
      const content = await generateForPlatform(topic, platform);

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
