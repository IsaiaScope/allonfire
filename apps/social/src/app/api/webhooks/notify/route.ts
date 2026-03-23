import {
  getDailySummary,
  getTopicStats,
  logWebhook,
} from "@allonfire/database";
import { NextResponse } from "next/server";
import { validateBearerToken } from "@/lib/api-auth";

export async function GET(request: Request) {
  const authError = validateBearerToken(request);
  if (authError) {
    return authError;
  }

  try {
    const [stats, daily] = await Promise.all([
      getTopicStats(),
      getDailySummary(),
    ]);

    const response = {
      overview: stats,
      today: daily,
      generatedAt: new Date().toISOString(),
    };

    await logWebhook({
      endpoint: "/api/webhooks/notify",
      method: "GET",
      response,
      status: 200,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    try {
      await logWebhook({
        endpoint: "/api/webhooks/notify",
        method: "GET",
        response: { error: message },
        status: 500,
      });
    } catch {
      // Best-effort logging — don't mask the original error
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
