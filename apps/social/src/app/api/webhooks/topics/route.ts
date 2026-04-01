import { ingestTopics, logWebhook } from "@allonfire/database";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateBearerToken } from "@/lib/api-auth";

const topicSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  sourceUrl: z.url(),
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
  const authError = validateBearerToken(request);
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

    revalidatePath("/discover");
    revalidatePath("/");

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    try {
      await logWebhook({
        endpoint: "/api/webhooks/topics",
        method: "POST",
        response: { error: message },
        status: 400,
      });
    } catch {
      // Best-effort logging — don't mask the original error
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
