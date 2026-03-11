import { ingestTopics, logWebhook } from "@allonfire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateApiKey } from "@/lib/api-auth";

const topicSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceName: z.string().min(1),
  category: z.enum([
    "NEWS",
    "MEME_WORTHY",
    "LEARNING",
    "TOOL_RELEASE",
    "AI_UPDATE",
  ]),
  rawData: z.unknown().optional(),
});

const bodySchema = z.object({
  topics: z.array(topicSchema).min(1),
});

export async function POST(request: Request) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { topics } = bodySchema.parse(body);
    const created = await ingestTopics(topics);

    const response = {
      ingested: created.length,
      duplicatesSkipped: topics.length - created.length,
    };

    await logWebhook({
      endpoint: "/api/webhooks/topics",
      method: "POST",
      payload: { topicCount: topics.length },
      response,
      status: 200,
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await logWebhook({
      endpoint: "/api/webhooks/topics",
      method: "POST",
      response: { error: message },
      status: 400,
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
