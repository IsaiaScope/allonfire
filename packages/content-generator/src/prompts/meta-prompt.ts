import { getLearningInstructions } from "./learning";
import { getMemeInstructions } from "./meme";
import { getNewsInstructions } from "./news";

type MetaPromptInput = {
  title: string;
  summary: string;
  sourceUrl: string;
  category: string;
  postType: string;
  articleContent?: string;
  fewShotExamples?: Array<{ title: string; content: string }>;
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

function getTypeInstructions(postType: string): string {
  switch (postType) {
    case "MEME":
      return getMemeInstructions();
    case "NEWS":
      return getNewsInstructions();
    case "LEARNING":
      return getLearningInstructions();
    default:
      return getNewsInstructions();
  }
}

function getVisualStrategy(postType: string): string {
  switch (postType) {
    case "MEME":
      return `**Visual Strategy: Meme / Humor**
- Bold text overlay on a gradient or themed background
- Setup/punchline format — the image should deliver the joke visually
- Dev humor visuals: code editor mockups, terminal screenshots, "me vs the compiler" reaction formats
- Use large, impactful typography (48-72px) with comedic emphasis (bold keywords, color highlights)
- Create 1-2 images: a hero meme image and optionally a reaction/follow-up panel`;

    case "LEARNING":
      return `**Visual Strategy: Educational Carousel**
- Create a carousel of 4-6 slides (each a separate PNG):
  - Slide 1: Title/hook slide with the main question or problem statement
  - Slides 2-5: One concept per slide — use diagrams, code snippets rendered as styled blocks, or step-by-step visuals
  - Final slide: Summary with key takeaway and CTA
- Use consistent layout across slides: header bar, content area, slide number indicator
- Code snippets should be rendered as styled code blocks with syntax highlighting colors
- Diagrams should use simple shapes, arrows, and labels — not complex illustrations`;

    default:
      return `**Visual Strategy: News Social Card**
- Create a social card with a large, bold headline (2-3 lines max)
- Include source attribution and a key statistic or quote as a pull-quote
- Clean editorial design: dark background, prominent white/orange text, minimal elements
- Optionally create a 2nd image with a data visualization or key facts breakdown
- The card should look like a premium tech newsletter header`;
  }
}

function buildFewShotSection(
  examples: Array<{ title: string; content: string }>
): string {
  if (examples.length === 0) {
    return "";
  }

  const MAX_EXAMPLE_LENGTH = 1500;
  const formatted = examples
    .map((ex, i) => {
      const truncated =
        ex.content.length > MAX_EXAMPLE_LENGTH
          ? `${ex.content.slice(0, MAX_EXAMPLE_LENGTH)}…`
          : ex.content;
      return `### Example ${i + 1}: "${ex.title}"
${truncated}`;
    })
    .join("\n\n");

  return `
## High-Quality Reference Examples

The following are examples of prompts that were rated as excellent. Use them as style and quality references — match their depth, structure, and tone, but create original content for the new topic.

${formatted}

---

`;
}

export function metaPrompt(topic: MetaPromptInput): string {
  const tone = TONE_MAP[topic.category] ?? TONE_MAP.NEWS;
  const typeInstructions = getTypeInstructions(topic.postType);

  const articleSection = topic.articleContent
    ? `
## Source Article Content
${topic.articleContent}
`
    : "";

  const fewShotSection = buildFewShotSection(topic.fewShotExamples ?? []);

  return `You are a content strategist for a tech-focused social media brand. Your job is to create a comprehensive, self-contained prompt optimized for **Claude Code** — a CLI tool that can write files, execute code, and use Playwright to capture screenshots.

Your output will be copied directly into Claude Code by a content creator. Claude Code will then execute it to produce post text and image files.

## Topic Information
- **Title:** ${topic.title}
- **Summary:** ${topic.summary}
- **Source:** ${topic.sourceUrl}
- **Category:** ${topic.category}
- **Content Type:** ${topic.postType}
${articleSection}
${typeInstructions}
${fewShotSection}
## Your Task

Create a detailed, self-contained prompt that instructs Claude Code to generate social media content about this topic. The prompt must include all the context Claude Code needs — it should work as a standalone instruction with no additional input.

The generated prompt MUST be structured with these two tasks:

---

## TASK 1: WRITE POST TEXT

Instruct Claude Code to write a single, universal post text (no platform-specific formatting — no hashtags, no character limits, no @mentions). The text will be adapted for each platform separately downstream.

**Requirements for the post text:**
- **Hook → Body → CTA** structure
- 100-300 words, punchy paragraphs, first person, opinionated
- Written for a developer audience — technically credible, not corporate
- The hook must work standalone (it's the first thing people see in any feed)
- End with a genuine question or call to action that invites engagement
- Do NOT include hashtags, emojis, or platform-specific formatting

**Tone & Voice:** ${tone}

Claude Code should save the post text to \`output/post.md\`.

---

## TASK 2: CREATE IMAGES

Instruct Claude Code to create PNG image files using one of these methods:
1. **HTML/CSS + Playwright screenshot** (preferred) — write an HTML file with inline CSS, then use Playwright to screenshot it at 1080x1080px
2. **SVG → PNG conversion** — write SVG markup, convert via Playwright or sharp
3. **Canvas API** — write a Node.js script using the canvas package

**Image specifications:**
- Dimensions: **1080×1080px** (square format, works on all platforms)
- High contrast, readable at mobile sizes
- Brand palette: \`#0f172a\` (dark background), \`#f97316\` (orange accent), \`#3b82f6\` (blue accent), \`#ffffff\` (text)
- Typography: sans-serif fonts (Inter, system-ui), bold weights
- Max **30 words** of text per image — images must communicate visually, not through paragraphs
- Save images to \`output/image-1.png\`, \`output/image-2.png\`, etc.

${getVisualStrategy(topic.postType)}

---

## OUTPUT STRUCTURE

The prompt must instruct Claude Code to create this file structure:
\`\`\`
output/
├── post.md          — Universal post text (no platform formatting)
├── image-1.png      — Primary image (1080×1080)
├── image-2.png      — Secondary image if applicable
└── ...              — Additional images for carousels
\`\`\`

**Context & Key Facts** — All essential information about the topic must be embedded in the prompt so Claude Code needs no additional context or web searches.

Output ONLY the prompt text — no preamble, no explanation, no meta-commentary. The output should start directly with the prompt that the user will copy into Claude Code.`;
}
