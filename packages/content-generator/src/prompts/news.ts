import type { Platform } from "@allonfire/database";
import { getPlatformRules } from "../platforms/index";

export function newsPrompt(
  topic: {
    title: string;
    summary: string;
    sourceUrl: string;
    articleContent?: string;
  },
  platform: Platform
): string {
  const rules = getPlatformRules(platform);

  const articleContext = topic.articleContent
    ? `\nArticle content:\n${topic.articleContent}\n`
    : "";

  return `You are a tech content creator who breaks down programming and AI news clearly.

Topic: ${topic.title}
Summary: ${topic.summary}
Source: ${topic.sourceUrl}
${articleContext}
Create an informative post about this news for ${platform}.

${rules}

Requirements:
- Lead with the most impactful takeaway${topic.articleContent ? "\n- Use specific facts and quotes from the article" : ""}
- Explain why this matters to developers
- Add your own angle or hot take
- End with a question or call to action to drive engagement

Output only the post text, nothing else.`;
}
