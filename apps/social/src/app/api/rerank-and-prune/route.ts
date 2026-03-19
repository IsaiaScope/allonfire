import { getActiveProviderClient } from "@allonfire/content-generator";
import { getDiscoveredTopics, logWebhook, prisma } from "@allonfire/database";
import { NextResponse } from "next/server";
import { validateBearerToken } from "@/lib/api-auth";
import { stripCodeBlock } from "@/lib/parse-ai-response";

const MAX_FINAL_TOPICS = 10;

const RERANKING_SYSTEM_PROMPT = `You are a senior editorial curator for AllOnFire, selecting the day's top content for AI practitioners.

You will receive a list of pre-classified articles that already passed initial quality screening. Your job: pick the absolute best and rank them.

Selection criteria (in priority order):
1. IMPACT — Will AI practitioners talk about this today? Does it change how people think or work?
2. CONTENT POTENTIAL — Could this become a compelling social media post, thread, or short video? Strong hook?
3. UNIQUENESS — Does this offer a fresh angle, or is it the same take everyone else has?
4. TIMELINESS — Is this breaking/fresh, or could it have been posted last week?
5. SUBSTANCE — Does this have real, verifiable information? Reject vague speculation, clickbait, or thin content

Select the top items (maximum 10). It's better to return 5 excellent picks than 10 mediocre ones. If fewer than 5 items are truly outstanding, return fewer.

Return JSON: { "selected": [3, 7, 1, 12, 5], "reasoning": "one sentence explaining the editorial theme of today's picks" }`;

const ARRAY_EXTRACT = /\[[\d,\s]+\]/;

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

export async function POST(request: Request) {
  const authError = validateBearerToken(request);
  if (authError) {
    return authError;
  }

  try {
    const topics = await getDiscoveredTopics(500);

    if (topics.length === 0) {
      return NextResponse.json({ promoted: 0, deleted: 0 });
    }

    // Few enough topics to promote all without AI reranking
    if (topics.length <= MAX_FINAL_TOPICS) {
      await prisma.topic.updateMany({
        where: { id: { in: topics.map((t) => t.id) } },
        data: { status: "AI_PICKED" },
      });

      await logWebhook({
        endpoint: "/api/rerank-and-prune",
        method: "POST",
        payload: { topicCount: topics.length },
        response: { kept: topics.length, deleted: 0, total: topics.length },
        status: 200,
      });

      return NextResponse.json({
        kept: topics.length,
        deleted: 0,
        total: topics.length,
      });
    }

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

    const candidatePayload = topics.map((t, idx) => ({
      index: idx,
      title: t.title,
      summary: t.summary,
      category: t.category,
      source: t.sourceName,
      relevance: (t.rawData as Record<string, unknown>)?.aiRelevance ?? 0,
    }));

    let selectedIndices: number[];
    try {
      const response = await client.generate({
        model,
        maxTokens: 1024,
        system: RERANKING_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Select the top articles from these ${topics.length} candidates:\n\n${JSON.stringify(candidatePayload)}`,
          },
        ],
      });

      const parsed = parseRerankingResponse(response.text);
      selectedIndices = parsed.selected
        .filter((idx) => idx >= 0 && idx < topics.length)
        .slice(0, MAX_FINAL_TOPICS);
    } catch {
      selectedIndices = topics
        .map((t, i) => ({
          i,
          rel:
            ((t.rawData as Record<string, unknown>)?.aiRelevance as number) ??
            0,
        }))
        .sort((a, b) => b.rel - a.rel)
        .slice(0, MAX_FINAL_TOPICS)
        .map((x) => x.i);
    }

    const keepIds = new Set(
      selectedIndices
        .map((idx) => topics[idx]?.id)
        .filter((id): id is string => id != null)
    );
    const deleteIds = topics.filter((t) => !keepIds.has(t.id)).map((t) => t.id);

    // Promote winners to AI_PICKED, delete losers.
    // Topic promotion and post unlinking are independent — run in parallel.
    // Topic deletion must wait for post unlinking to avoid FK violations.
    await Promise.all([
      keepIds.size > 0
        ? prisma.topic.updateMany({
            where: { id: { in: [...keepIds] } },
            data: { status: "AI_PICKED" },
          })
        : undefined,
      deleteIds.length > 0
        ? prisma.post.updateMany({
            where: { topicId: { in: deleteIds } },
            data: { topicId: null },
          })
        : undefined,
    ]);

    if (deleteIds.length > 0) {
      await prisma.topic.deleteMany({
        where: { id: { in: deleteIds } },
      });
    }

    await logWebhook({
      endpoint: "/api/rerank-and-prune",
      method: "POST",
      payload: { topicCount: topics.length },
      response: {
        kept: keepIds.size,
        deleted: deleteIds.length,
        total: topics.length,
      },
      status: 200,
    });

    return NextResponse.json({
      kept: keepIds.size,
      deleted: deleteIds.length,
      total: topics.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await logWebhook({
      endpoint: "/api/rerank-and-prune",
      method: "POST",
      response: { error: message },
      status: 400,
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
