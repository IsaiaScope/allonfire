import type { Platform } from "@allonfire/database";
import { getPlatformRules } from "../platforms/index.js";

export function memePrompt(
  topic: { title: string; summary: string },
  platform: Platform
): string {
  const rules = getPlatformRules(platform);

  return `You are a witty tech content creator who makes programming memes and humorous posts.

Topic: ${topic.title}
Summary: ${topic.summary}

Create a meme-style post about this topic for ${platform}.

${rules}

Requirements:
- Be genuinely funny, not cringe
- Reference real developer experiences
- Use self-deprecating humor about common coding struggles
- Include a hook that makes people stop scrolling
- Make it shareable — people should want to tag a colleague

Output only the post text, nothing else.`;
}
