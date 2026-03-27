<h1 align="center">@allonfire/content-generator</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Anthropic-Claude-D4A574?style=flat&logo=anthropic&logoColor=white" alt="Anthropic" />
  <img src="https://img.shields.io/badge/Google-Gemini-4285F4?style=flat&logo=google&logoColor=white" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/Groq-LPU-F55036?style=flat" alt="Groq" />
  <img src="https://img.shields.io/badge/OpenRouter-Multi--Model-6366F1?style=flat" alt="OpenRouter" />
</p>

<p align="center">AI-powered content generation pipeline for the AllOnFire social media platform. Takes discovered topics, applies platform-specific rules and post-type instructions, builds a meta-prompt with few-shot examples, sends it to the active AI provider, and stores the generated prompt for human review.</p>

## Pipeline

```
Topic (from database)
  |
  +--> Extract article content (Readability + linkedom)
  |
  +--> Load few-shot examples (positive-rated prompts from same category)
  |
  +--> Post-type instructions (meme / news / learning)
  |
  +--> Meta-prompt assembly
  |      - Topic info (title, summary, source URL, category)
  |      - Tone & voice rules per category
  |      - Visual strategy per post type
  |      - CSS recipes for image generation
  |      - Few-shot reference examples
  |      - Output structure instructions
  |
  +--> AI Provider (Anthropic / Gemini / Groq / OpenRouter)
  |
  +--> Store generated prompt in database
```

## API Reference

### Main Exports (`@allonfire/content-generator`)

| Export | Type | Description |
|---|---|---|
| `generatePromptForTopic(topicId)` | `(string) => Promise<void>` | Full pipeline: fetch topic, extract article, build meta-prompt, call AI, save result |
| `getActiveProviderClient()` | `() => Promise<{ client, model }>` | Resolve the active AI provider from the database and return its client |

### Provider Exports (`@allonfire/content-generator/providers`)

| Export | Type | Description |
|---|---|---|
| `getActiveProviderClient()` | `() => Promise<{ client, model }>` | Same as above, available from the providers sub-path |
| `ProviderClient` | Type | Interface with `generate()`, `validate()`, `listModels()` methods |
| `GenerateRequest` | Type | `{ model, maxTokens, system?, messages }` |
| `GenerateResponse` | Type | `{ text, usage? }` |

### Individual Provider Factories

| Sub-path | Factory | Description |
|---|---|---|
| `providers/anthropic` | `createAnthropicProvider(apiKey)` | Wraps the Anthropic SDK |
| `providers/openrouter` | `createOpenRouterProvider(apiKey)` | OpenAI-compatible client pointed at OpenRouter |
| `providers/gemini` | `createGeminiProvider(apiKey)` | Wraps the Google GenAI SDK |
| `providers/groq` | `createGroqProvider(apiKey)` | OpenAI-compatible client pointed at Groq |

### Prompt Templates (`@allonfire/content-generator/prompts/*`)

| Export | Description |
|---|---|
| `metaPrompt(input)` | Assembles the full prompt with topic info, type instructions, visual strategy, CSS recipes, and few-shot examples |
| `getMemeInstructions()` | Humor-focused post instructions |
| `getNewsInstructions()` | News/analysis post instructions |
| `getLearningInstructions()` | Educational post instructions |

### Platform Rules (`@allonfire/content-generator/platforms/*`)

| Export | Description |
|---|---|
| `PLATFORM_RULES` | Record mapping each `Platform` to its formatting rules |
| `getPlatformRules(platform)` | Get rules string for a specific platform |
| `linkedinRules` | LinkedIn-specific content guidelines |
| `twitterRules` | Twitter/X-specific content guidelines |

## Supported Providers

| Provider | SDK | Model Examples |
|---|---|---|
| Anthropic | `@anthropic-ai/sdk` | `claude-sonnet-4-20250514`, `claude-haiku-4-5-20251001` |
| Google Gemini | `@google/genai` | `gemini-2.0-flash`, `gemini-2.5-pro` |
| Groq | `openai` (custom base URL) | `llama-3.1-8b-instant`, `llama-3.3-70b-versatile` |
| OpenRouter | `openai` (custom base URL) | `openai/gpt-4o-mini`, `anthropic/claude-sonnet-4-20250514` |

All providers implement the same `ProviderClient` interface with three methods:

- `generate(request)` -- Send a prompt and receive generated text with optional token usage
- `validate()` -- Quick health check with a minimal request
- `listModels()` -- Enumerate available models from the provider API

## Directory Structure

```
packages/content-generator/
  src/
    index.ts                 Public API: generatePromptForTopic, getActiveProviderClient
    generate.ts              Core pipeline: article extraction, few-shot loading, prompt assembly, AI call
    extract-article.ts       HTML-to-text extraction using Readability + linkedom
    cli.ts                   CLI entry point (pnpm generate)
    providers/
      index.ts               Provider factory resolution from database config
      types.ts               ProviderClient, GenerateRequest, GenerateResponse types
      anthropic.ts           Anthropic SDK adapter
      gemini.ts              Google GenAI SDK adapter
      groq.ts                Groq adapter (OpenAI-compatible)
      openrouter.ts          OpenRouter adapter (OpenAI-compatible)
    prompts/
      index.ts               Prompt template re-exports
      meta-prompt.ts         Master prompt builder (tone, visual strategy, CSS recipes, few-shot)
      meme.ts                Meme/humor post type instructions
      news.ts                News/analysis post type instructions
      learning.ts            Educational post type instructions
    platforms/
      index.ts               Platform rules registry and lookup
      linkedin.ts            LinkedIn content formatting rules
      twitter.ts             Twitter/X content formatting rules
    media/
      (image processing utilities)
```

## Usage

Generate a prompt for a selected topic:

```ts
import { generatePromptForTopic } from "@allonfire/content-generator";

// Runs the full pipeline: fetch topic -> extract article -> build prompt -> call AI -> save
await generatePromptForTopic(topicId);
```

Use the provider client directly for custom generation:

```ts
import { getActiveProviderClient } from "@allonfire/content-generator";

const { client, model } = await getActiveProviderClient();
const response = await client.generate({
  model,
  maxTokens: 4096,
  messages: [{ role: "user", content: "Explain WebSockets in 3 sentences." }],
});
console.log(response.text);
```

Use platform rules for downstream formatting:

```ts
import { getPlatformRules } from "@allonfire/content-generator/platforms/index";

const rules = getPlatformRules("LINKEDIN");
```

## Scripts

| Command | Description |
|---|---|
| `pnpm generate` | Run the CLI generation tool |

## Dependencies

| Package | Purpose |
|---|---|
| `@allonfire/database` | Topic/prompt/provider data access |
| `@anthropic-ai/sdk` | Anthropic Claude API client |
| `@google/genai` | Google Gemini API client |
| `openai` | OpenAI-compatible client (used for Groq and OpenRouter) |
| `@mozilla/readability` | Article content extraction from HTML |
| `linkedom` | Server-side DOM for Readability parsing |
