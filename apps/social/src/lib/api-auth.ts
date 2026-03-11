import { NextResponse } from "next/server";
import { env } from "@/env";

export function validateApiKey(request: Request): NextResponse | null {
  if (!env.ALLONFIRE_API_KEY) {
    return NextResponse.json(
      { error: "API key not configured on server" },
      { status: 500 }
    );
  }

  const providedKey = request.headers.get("X-API-Key");
  if (!providedKey || providedKey !== env.ALLONFIRE_API_KEY) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  return null;
}
