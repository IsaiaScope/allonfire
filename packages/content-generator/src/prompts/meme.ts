import type { Platform } from "@allonfire/database";
import { getPlatformRules } from "../platforms/index";

export function memePrompt(
  topic: {
    title: string;
    summary: string;
    articleContent?: string;
  },
  platform: Platform
): string {
  const rules = getPlatformRules(platform);

  const articleContext = topic.articleContent
    ? `\nArticle content:\n${topic.articleContent}\n`
    : "";

  return `You are a witty tech content creator who makes programming memes and humorous posts.

Topic: ${topic.title}
Summary: ${topic.summary}
${articleContext}
Create a meme-style post about this topic for ${platform}.

${rules}

Requirements:
- Be genuinely funny, not cringe
- Reference real developer experiences${topic.articleContent ? "\n- Find the most relatable angle from the article content" : ""}
- Use self-deprecating humor about common coding struggles
- Include a hook that makes people stop scrolling
- Make it shareable — people should want to tag a colleague

Output only the post text, nothing else.`;
}
