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
      return `**Visual Strategy: Meme / Humor — pick 2 distinct approaches from these:**
- **Fake code editor:** VS Code-style screenshot with a humorous code snippet, absurd variable names, or a funny error message. Use a dark editor theme with syntax highlighting colors.
- **Terminal mockup:** Console/terminal window with a funny command output, stack trace, or git log. Monospace font, green-on-black or dark theme.
- **Before/After split:** Left panel = expectation, right panel = reality. Use contrasting colors (calm blue vs chaotic red/orange).
- **Chat mockup:** Fake Slack/Discord conversation with a funny team exchange about the topic. Use chat bubble layouts with avatars.
- **Bold text meme:** Large impactful typography (48-72px) with setup/punchline on a gradient background. Comedic emphasis via bold keywords and color highlights.`;

    case "LEARNING":
      return `**Visual Strategy: Educational — pick 2-3 distinct approaches from these:**
- **Code snippet with annotations:** Syntax-highlighted code block with arrow callouts pointing to key lines. Use colored \`<span>\` tags for highlighting (green=strings, blue=keywords, orange=functions).
- **Flowchart/architecture diagram:** Boxes connected by arrows using CSS flexbox/grid. Each box = one concept with a label and icon/emoji.
- **Before/After code comparison:** Two-panel layout — left panel (red tint) = bad/old code, right panel (green tint) = good/new code. Highlight the difference.
- **Step-by-step visual:** Numbered steps (1→2→3→4) in a vertical or grid layout, each with an icon and a brief label. Show the progression visually.
- **Carousel slides** (4-6 PNGs): Slide 1 = title/hook, slides 2-5 = one concept per slide, final = summary/CTA. Consistent header bar and slide number across all.`;

    default:
      return `**Visual Strategy: News — pick 2 distinct approaches from these:**
- **Social card:** Large bold headline (2-3 lines), source attribution, and a key stat pulled out as a big number with context label.
- **Timeline visualization:** Horizontal or vertical timeline showing before → announcement → expected impact. Use connected nodes with dates/labels.
- **Comparison layout:** Two-column or table layout showing "what was" vs "what changed." Use contrasting colors for old/new.
- **Quote card:** Key statement from the article as a large pull-quote with attribution. Elegant editorial design with accent borders.
- **Key facts breakdown:** 3-4 data points laid out in a grid, each with a large number/icon and a one-line explanation.`;
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

  return `You are a content strategist for a tech-focused social media brand. Your job is to create a comprehensive, self-contained prompt optimized for **Claude Code**.

Your output will be copied directly into Claude Code by a content creator. Claude Code will then execute it to produce post text and image files.

## How Claude Code Works (CRITICAL — Read This First)

Claude Code is a **conversational AI agent** in a CLI. It reads natural language instructions and executes them by writing files and running shell commands. It does NOT have a JavaScript SDK or custom API.

**Your output must be plain English instructions with embedded content.** Do NOT output executable code, function calls, or pseudo-code. Claude Code cannot run \`claude.writeFile()\`, \`claude.run()\`, or any custom API.

**CORRECT format — natural language with inline content:**
\`\`\`
Create a file \`output/post.md\` with this content:

[the actual post text here]

---

Create a file \`output/image-1.html\` with this content:

[the actual HTML/CSS here]

Then take a screenshot of \`output/image-1.html\` at 1080x1080 pixels and save it as \`output/image-1.png\` using Playwright:
npx playwright screenshot --viewport-size=1080,1080 output/image-1.html output/image-1.png
\`\`\`

**WRONG format — DO NOT do this:**
\`\`\`
claude.writeFile("output/post.md", content);
claude.screenshot("output/image-1.html", "output/image-1.png");
\`\`\`

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

Instruct Claude Code to create PNG image files using this exact workflow:

1. Write an HTML file with **all styles inline** (no external dependencies, no \`<link>\` tags)
2. Screenshot it with Playwright CLI: \`npx playwright screenshot --viewport-size=1080,1080 output/image-1.html output/image-1.png\`

**The prompt must include the complete, ready-to-render HTML source code for each image** — not a description of what to build, but the actual HTML that Claude Code will write to a file.

**Image specifications:**
- Dimensions: **1080×1080px** (square format)
- High contrast, readable at mobile sizes
- **Primary palette:** \`#0f172a\` (dark bg), \`#f97316\` (orange accent), \`#3b82f6\` (blue accent), \`#ffffff\` (text)
- **Extend with contextual colors** when the visual calls for it — syntax highlighting colors for code snippets, green/red for before/after comparisons, gradient backgrounds for variety
- Typography: sans-serif fonts (system-ui) for headlines, **monospace (Fira Code, Consolas, monospace)** for code snippets
- Max **30 words** of text per image (code snippets don't count toward this limit)
- Each image must use a **different visual approach** — don't make two images that look like the same template with different text
- Save images to \`output/image-1.png\`, \`output/image-2.png\`, etc.

**Visual variety is critical.** Do NOT create multiple images that are just "headline text on a colored background." At least one image should include a structured visual element: a code snippet, a diagram, a comparison layout, a mockup, or a data visualization rendered in HTML/CSS.

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

Output ONLY natural language instructions with embedded content (the actual post text, the actual HTML files, and the shell commands to run). No preamble, no code blocks wrapping the entire output, no fictional APIs, no pseudo-code. The output should read like a step-by-step task brief that Claude Code can follow directly.`;
}
