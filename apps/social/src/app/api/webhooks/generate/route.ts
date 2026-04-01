import { generatePromptForTopic } from "@allonfire/content-generator";
import { getTopicsByStatus, logWebhook } from "@allonfire/database";
import { revalidatePath } from "next/cache";
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

    const settled = await Promise.allSettled(
      topicIds.map((id) => generatePromptForTopic(id))
    );

    const results = settled.map((result, i) => ({
      topicId: topicIds[i],
      success: result.status === "fulfilled",
      ...(result.status === "rejected" && {
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      }),
    }));

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

    revalidatePath("/generate");
    revalidatePath("/");

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    try {
      await logWebhook({
        endpoint: "/api/webhooks/generate",
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
