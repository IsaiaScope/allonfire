import {
  getDiscoveredTopicsPaginated,
  type TopicCategory,
} from "@allonfire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: z
    .enum(["NEWS", "MEME_WORTHY", "LEARNING", "TOOL_RELEASE", "AI_UPDATE"])
    .optional(),
  search: z.string().min(2).optional(),
  sort: z.enum(["newest", "oldest", "source"]).default("newest"),
});

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);

  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { cursor, limit, category, search, sort } = parsed.data;

  const result = await getDiscoveredTopicsPaginated({
    cursor,
    limit,
    category: category as TopicCategory | undefined,
    search,
    sort,
  });

  const response = NextResponse.json(result);
  response.headers.set(
    "Cache-Control",
    "private, max-age=30, stale-while-revalidate=60"
  );
  return response;
}
