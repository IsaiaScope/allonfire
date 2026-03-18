import { NextResponse } from "next/server";
import { env } from "@/env";

export function validateBearerToken(request: Request): NextResponse | null {
  if (!env.N8N_API_KEY) {
    return NextResponse.json(
      { error: "API key not configured on server" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  if (token !== env.N8N_API_KEY) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return null;
}
