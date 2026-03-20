type MetaPromptInput = {
  title: string;
  summary: string;
  sourceUrl: string;
  category: string;
  articleContent?: string;
};

const TONE_MAP: Record<string, string> = {
  MEME_WORTHY:
    "Witty, relatable developer humor. Self-deprecating jokes about common coding struggles. The tone should make developers stop scrolling and tag a colleague.",
  LEARNING:
    "Educational and step-by-step. Break down concepts clearly with practical examples. The tone should make readers feel they learned something valuable.",
  TOOL_RELEASE:
    "Educational and practical. Focus on what the tool does, why it matters, and how to get started. Include concrete use cases.",
  NEWS: "Authoritative and timely. Provide context on why this matters, who it affects, and what comes next. Balance informative with engaging.",
  AI_UPDATE:
    "Authoritative with forward-looking analysis. Explain the significance, compare to prior state-of-the-art, and speculate on implications.",
};

export function metaPrompt(topic: MetaPromptInput): string {
  const tone = TONE_MAP[topic.category] ?? TONE_MAP.NEWS;

  const articleSection = topic.articleContent
    ? `
## Source Article Content
${topic.articleContent}
`
    : "";

  return `You are a content strategist for a tech-focused social media brand. Your job is to create a comprehensive, self-contained content creation prompt that can be used with any AI tool to generate social media posts.

## Topic Information
- **Title:** ${topic.title}
- **Summary:** ${topic.summary}
- **Source:** ${topic.sourceUrl}
- **Category:** ${topic.category}
${articleSection}
## Your Task

Create a detailed, self-contained prompt that a content creator can copy-paste into any AI tool (ChatGPT, Claude, Gemini, etc.) to generate high-quality social media content about this topic. The prompt should be comprehensive enough that the AI receiving it needs no additional context.

The generated prompt MUST include:

1. **Context & Key Facts** — All essential information about the topic extracted from the title, summary, and article content. The prompt should be self-contained so the AI doesn't need to look anything up.

2. **Tone & Voice Direction** — ${tone}

3. **Text Content Suggestions** — The prompt should instruct the AI to create:
   - 3 hook variations (the opening line that stops the scroll)
   - Body content with key talking points
   - 2-3 call-to-action variations (engagement-driving closers)
   - Relevant hashtag suggestions

4. **Visual & Media Ideas** — The prompt should ask for:
   - 2-3 image concepts (what to generate with AI image tools or design)
   - Carousel structure ideas (if applicable — slide-by-slide breakdown)
   - Short-form video angles (hook, key frames, closing)
   - Meme format suggestions (if the tone fits)

5. **Platform Adaptation Notes** — The prompt should include brief guidance for adapting to:
   - LinkedIn (professional tone, longer form)
   - Twitter/X (concise, thread potential)
   - YouTube (script outline, thumbnail ideas)
   - TikTok (video script, trending format hooks)

Output ONLY the prompt text — no preamble, no explanation, no meta-commentary. The output should start directly with the prompt that the user will copy.`;
}
