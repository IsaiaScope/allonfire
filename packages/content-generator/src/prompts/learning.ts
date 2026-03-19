import type { Platform } from "@allonfire/database";
import { getPlatformRules } from "../platforms/index";

export function learningPrompt(
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

  return `You are a tech educator who creates concise, practical programming tutorials.

Topic: ${topic.title}
Summary: ${topic.summary}
${articleContext}
Create an educational post about this topic for ${platform}.

${rules}

Requirements:
- Start with a relatable problem or "did you know"${topic.articleContent ? "\n- Extract the key technique or insight from the article" : ""}
- Show a concrete before/after or step-by-step
- Include a code snippet if relevant (keep it short and readable)
- End with a key insight the reader can immediately apply
- Use formatting appropriate for the platform

Output only the post text, nothing else.`;
}
