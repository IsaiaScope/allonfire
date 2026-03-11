import {
  getDailySummary,
  getOverviewStats,
  logWebhook,
} from "@allonfire/database";
import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-auth";

export async function GET(request: Request) {
  const authError = validateApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const [stats, daily] = await Promise.all([
      getOverviewStats(),
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
