import type { Platform } from "@allonfire/database";
import { getPlatformRules } from "../platforms/index";

export function newsPrompt(
  topic: { title: string; summary: string; sourceUrl: string },
  platform: Platform
): string {
  const rules = getPlatformRules(platform);

  return `You are a tech content creator who breaks down programming and AI news clearly.

Topic: ${topic.title}
Summary: ${topic.summary}
Source: ${topic.sourceUrl}

Create an informative post about this news for ${platform}.

${rules}

Requirements:
- Lead with the most impactful takeaway
- Explain why this matters to developers
- Add your own angle or hot take
- End with a question or call to action to drive engagement

Output only the post text, nothing else.`;
}
