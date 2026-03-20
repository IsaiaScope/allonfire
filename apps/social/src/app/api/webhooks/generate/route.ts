import { generatePromptForTopic } from "@allonfire/content-generator";
import { getTopicsByStatus, logWebhook } from "@allonfire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateBearerToken } from "@/lib/api-auth";

const bodySchema = z.object({
  topicId: z.cuid2().optional(),
});

export async function POST(request: Request) {
  const authError = validateBearerToken(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { topicId } = bodySchema.parse(body);

    let topicIds: string[];

    if (topicId) {
      topicIds = [topicId];
    } else {
      const selected = await getTopicsByStatus(["SELECTED"]);
      topicIds = selected.map((t) => t.id);
    }

    if (topicIds.length === 0) {
      return NextResponse.json({
        generated: 0,
        message: "No topics to generate",
      });
    }

    const results: Array<{
      topicId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const id of topicIds) {
      try {
        await generatePromptForTopic(id);
        results.push({ topicId: id, success: true });
      } catch (error) {
        results.push({
          topicId: id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const response = {
      generated: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };

    await logWebhook({
      endpoint: "/api/webhooks/generate",
      method: "POST",
      payload: { topicIds },
      response,
      status: 200,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await logWebhook({
      endpoint: "/api/webhooks/generate",
      method: "POST",
      response: { error: message },
      status: 400,
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
