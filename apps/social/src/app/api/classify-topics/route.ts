import { getActiveProviderClient } from "@allonfire/content-generator";
import { logWebhook } from "@allonfire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateBearerToken } from "@/lib/api-auth";

const itemSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  sourceUrl: z.url(),
  sourceName: z.string().min(1),
  rawData: z.unknown().optional(),
});

type Item = z.infer<typeof itemSchema>;

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(100),
});

const RELEVANCE_THRESHOLD = 0.7;
const MAX_FINAL_TOPICS = 10;
const BATCH_SIZE = 10;

const CLASSIFICATION_SYSTEM_PROMPT = `You are a ruthlessly selective content curator for AllOnFire, a social media brand serving AI practitioners — people who build, deploy, and research AI systems.

Classify each article into exactly one category and score its relevance.

Categories:
- NEWS: Major industry news, acquisitions, regulations, or market moves that AI practitioners would discuss
- MEME_WORTHY: Developer/AI humor with genuine viral potential — would get shared in team Slack channels
- LEARNING: Tutorials, techniques, or insights so valuable that AI practitioners would bookmark them
- TOOL_RELEASE: New tools, frameworks, or major versions that change how people build AI systems
- AI_UPDATE: Model releases, research breakthroughs, or product launches that shift what's possible with AI

Scoring — be extremely selective. Most articles are NOT worth posting about:
- 0.9-1.0: Would dominate AI Twitter/LinkedIn for the day. Major model release, breakthrough paper, industry-shaking news
- 0.8-0.89: Strong social content potential. Clear hook that would make AI practitioners stop scrolling
- 0.7-0.79: Solid content but needs a creative angle to stand out
- 0.5-0.69: Mildly interesting but would make a forgettable post. Most items belong here
- Below 0.5: Noise — incremental updates, niche without broad appeal, or rehashed content

For each item, ask: "Would an AI engineer share this with their team?" If not, score below 0.7.

Return JSON array: [{ "index": 0, "category": "...", "summary": "max 500 chars, hook-driven and engaging for AI practitioners — provide enough context to create a social post from this summary alone", "relevance": 0.0-1.0 }]`;

const RERANKING_SYSTEM_PROMPT = `You are a senior editorial curator for AllOnFire, selecting the day's top content for AI practitioners.

You will receive a list of pre-classified articles that already passed initial quality screening. Your job: pick the absolute best and rank them.

Selection criteria (in priority order):
1. IMPACT — Will AI practitioners talk about this today? Does it change how people think or work?
2. CONTENT POTENTIAL — Could this become a compelling social media post, thread, or short video? Strong hook?
3. UNIQUENESS — Does this offer a fresh angle, or is it the same take everyone else has?
4. TIMELINESS — Is this breaking/fresh, or could it have been posted last week?

Select the top items (maximum 10). It's better to return 5 excellent picks than 10 mediocre ones. If fewer than 5 items are truly outstanding, return fewer.

Return JSON: { "selected": [3, 7, 1, 12, 5], "reasoning": "one sentence explaining the editorial theme of today's picks" }`;

const VALID_CATEGORIES = new Set([
  "NEWS",
  "MEME_WORTHY",
  "LEARNING",
  "TOOL_RELEASE",
  "AI_UPDATE",
]);

const CODE_BLOCK_START = /^```(?:json)?\n?/;
const CODE_BLOCK_END = /\n?```$/;
const ARRAY_EXTRACT = /\[[\d,\s]+\]/;

function stripCodeBlock(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(CODE_BLOCK_START, "").replace(CODE_BLOCK_END, "");
  }
  return trimmed;
}

type ClassificationResult = {
  index: number;
  category: string;
  summary: string;
  relevance: number;
};

type ClassifiedTopic = {
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  category: string;
  rawData?: unknown;
};

function parseClassifications(
  responseText: string,
  batchLength: number
): ClassificationResult[] {
  try {
    return JSON.parse(stripCodeBlock(responseText));
  } catch {
    return Array.from({ length: batchLength }, (_, idx) => ({
      index: idx,
      category: "NEWS",
      summary: "",
      relevance: 0.4,
    }));
  }
}

function mapClassification(
  cls: ClassificationResult,
  batch: Item[]
): ClassifiedTopic | null {
  const relevance = Number(cls.relevance) || 0;
  if (relevance < RELEVANCE_THRESHOLD) {
    return null;
  }

  const original = batch[cls.index % batch.length];
  if (!original) {
    return null;
  }

  const category = VALID_CATEGORIES.has(cls.category) ? cls.category : "NEWS";

  const hasRawData =
    typeof original.rawData === "object" && original.rawData !== null;

  return {
    title: original.title,
    summary: cls.summary || original.summary || original.title,
    sourceUrl: original.sourceUrl,
    sourceName: original.sourceName,
    category,
    rawData: hasRawData
      ? {
          ...(original.rawData as Record<string, unknown>),
          aiRelevance: relevance,
        }
      : { aiRelevance: relevance },
  };
}

function parseRerankingResponse(text: string): {
  selected: number[];
  reasoning?: string;
} {
  const cleaned = stripCodeBlock(text);
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.selected)) {
      return parsed;
    }
    if (Array.isArray(parsed)) {
      return { selected: parsed };
    }
  } catch {
    const match = cleaned.match(ARRAY_EXTRACT);
    if (match) {
      return { selected: JSON.parse(match[0]) };
    }
  }
  return { selected: [] };
}

function fallbackByRelevance(candidates: ClassifiedTopic[]): ClassifiedTopic[] {
  return [...candidates]
    .sort((a, b) => {
      const relA =
        ((a.rawData as Record<string, unknown>)?.aiRelevance as number) ?? 0;
      const relB =
        ((b.rawData as Record<string, unknown>)?.aiRelevance as number) ?? 0;
      return relB - relA;
    })
    .slice(0, MAX_FINAL_TOPICS);
}

async function rerankCandidates(
  candidates: ClassifiedTopic[],
  client: {
    generate: (req: {
      model: string;
      maxTokens: number;
      system: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    }) => Promise<{ text: string }>;
  },
  model: string
): Promise<ClassifiedTopic[]> {
  if (candidates.length <= MAX_FINAL_TOPICS) {
    return candidates;
  }

  const candidatePayload = candidates.map((c, idx) => ({
    index: idx,
    title: c.title,
    summary: c.summary,
    category: c.category,
    source: c.sourceName,
    relevance: (c.rawData as Record<string, unknown>)?.aiRelevance ?? 0,
  }));

  try {
    const response = await client.generate({
      model,
      maxTokens: 1024,
      system: RERANKING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Select the top articles from these ${candidates.length} candidates:\n\n${JSON.stringify(candidatePayload)}`,
        },
      ],
    });

    const parsed = parseRerankingResponse(response.text);

    const reranked = parsed.selected
      .filter((idx) => idx >= 0 && idx < candidates.length)
      .slice(0, MAX_FINAL_TOPICS)
      .map((idx) => candidates[idx])
      .filter((topic): topic is ClassifiedTopic => topic !== undefined);

    if (reranked.length === 0) {
      return fallbackByRelevance(candidates);
    }

    return reranked;
  } catch {
    return fallbackByRelevance(candidates);
  }
}

export async function POST(request: Request) {
  const authError = validateBearerToken(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { items } = bodySchema.parse(body);

    let providerResult: Awaited<ReturnType<typeof getActiveProviderClient>>;
    try {
      providerResult = await getActiveProviderClient();
    } catch {
      return NextResponse.json(
        {
          error: "No AI provider configured. Set one up at /admin/providers.",
        },
        { status: 503 }
      );
    }

    const { client, model } = providerResult;
    const classified: ClassifiedTopic[] = [];

    // Stage 1: Classify in batches
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const batchPayload = batch.map((item, idx) => ({
        index: idx,
        title: item.title,
        summary: item.summary,
        source: item.sourceName,
        url: item.sourceUrl,
      }));

      const response = await client.generate({
        model,
        maxTokens: 8192,
        system: CLASSIFICATION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Classify these articles as JSON array:\n\n${JSON.stringify(batchPayload)}`,
          },
        ],
      });

      const classifications = parseClassifications(response.text, batch.length);

      for (const cls of classifications) {
        const topic = mapClassification(cls, batch);
        if (topic) {
          classified.push(topic);
        }
      }
    }

    // Stage 2: Listwise reranking — pick the best from all candidates
    const finalTopics = await rerankCandidates(classified, client, model);

    const result = {
      classified: finalTopics,
      filtered: items.length - finalTopics.length,
      total: items.length,
      candidatesBeforeReranking: classified.length,
    };

    await logWebhook({
      endpoint: "/api/classify-topics",
      method: "POST",
      payload: { itemCount: items.length },
      response: {
        selected: finalTopics.length,
        candidatesBeforeReranking: classified.length,
        filtered: items.length - finalTopics.length,
        total: items.length,
      },
      status: 200,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await logWebhook({
      endpoint: "/api/classify-topics",
      method: "POST",
      response: { error: message },
      status: 400,
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
