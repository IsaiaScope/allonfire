import { getActiveProviderClient } from "@allonfire/content-generator";
import { logWebhook } from "@allonfire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateBearerToken } from "@/lib/api-auth";
import { stripCodeBlock } from "@/lib/parse-ai-response";

const itemSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  sourceUrl: z.url(),
  sourceName: z.string().min(1),
  rawData: z.unknown().optional(),
});

type Item = z.infer<typeof itemSchema>;

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(500),
});

const RELEVANCE_THRESHOLD = 0.6;
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

Return JSON array: [{ "index": 0, "category": "...", "summary": "...", "relevance": 0.0-1.0 }]

Summary rules:
- Summarize what is known from the title and available context. State the topic, why it matters to AI practitioners, and what kind of social post it could become.
- Do NOT invent specifics not present in the input. Never fabricate quotes, stats, or details.
- If the title alone is unclear, say what the topic appears to be about and frame it as a content opportunity.
- Write like an editorial pitch note: "this is what this topic is about, here's why it's postable."
- Be direct and confident about what IS known, but never pretend to know more than the input provides.
- Max 600 chars.`;

const VALID_CATEGORIES = new Set([
  "NEWS",
  "MEME_WORTHY",
  "LEARNING",
  "TOOL_RELEASE",
  "AI_UPDATE",
]);

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

    const result = {
      classified,
      filtered: items.length - classified.length,
      total: items.length,
    };

    await logWebhook({
      endpoint: "/api/classify-topics",
      method: "POST",
      payload: { itemCount: items.length },
      response: {
        candidates: classified.length,
        filtered: items.length - classified.length,
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
