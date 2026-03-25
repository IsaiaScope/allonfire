<h1 align="center">Generation</h1>

<p align="center">
  <img src="https://img.shields.io/badge/TanStack_Query-FF4154?style=flat&logo=reactquery&logoColor=white" alt="TanStack Query" />
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=flat&logo=framer&logoColor=white" alt="Framer Motion" />
</p>

<p align="center">
  Trigger AI content generation from selected topics and manage the resulting prompts. Interfaces with the <code>@allonfire/content-generator</code> package to produce platform-specific social media text.
</p>

## 📸 Screenshots

<p align="center">
  <img src="../../../../../docs/screenshots/generate.png" width="600" alt="Generate page" />
  &nbsp;&nbsp;
  <img src="../../../../../docs/screenshots/mobile-generate.png" width="200" alt="Generate mobile view" />
</p>

## 📁 Directory Structure

```
generation/
  actions/
    generate.ts                       Trigger prompt generation via content-generator
    prompt.ts                         Rate, add notes, and delete prompts
  components/
    generate-client.tsx               Main generate page orchestrator
    generate-filters.tsx              Rating filter pills and search bar
    generate-prompt-button.tsx        Standalone button to trigger generation
    prompt-card.tsx                   Collapsible card with prompt text and rating
    prompt-list.tsx                   List of generated prompts per topic
    topic-card-generate-actions.tsx   Generate/delete action buttons per topic
```

## :sparkles: Key Capabilities

- **Content generation** — Triggers the `@allonfire/content-generator` package to produce prompts for each platform
- **Prompt rating** — Positive/negative rating system to track prompt quality
- **Notes** — Add free-text notes to prompts (up to 500 characters)
- **Copy to clipboard** — One-click copy of generated prompt text
- **Collapsible cards** — Expand/collapse prompt cards for quick scanning

## :arrows_counterclockwise: Data Flow

```
GenerateClient (orchestrator)
  GenerateFilters (rating pills, search)
  TopicCardGenerateActions (trigger generation / delete)
    generate.ts action -> @allonfire/content-generator
  PromptList (per-topic prompt display)
    PromptCard (collapsible, with rating + notes)
      prompt.ts actions (rate / note / delete)
  GeneratePromptButton (standalone trigger)
```

## :link: Import Pattern

```ts
import { GenerateClient } from "@/features/generation/components/generate-client";
import { GeneratePromptButton } from "@/features/generation/components/generate-prompt-button";
import { PromptCard } from "@/features/generation/components/prompt-card";
```

No barrel `index.ts` files — always import directly from the specific file.
