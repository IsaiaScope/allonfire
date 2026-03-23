import { getSelectedTopicsPaginated } from "@allonfire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  rating: z.enum(["POSITIVE", "NEGATIVE", "HAS_NOTES"]).optional(),
  search: z.string().min(2).optional(),
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

  const { cursor, limit, rating, search } = parsed.data;

  const result = await getSelectedTopicsPaginated({
    cursor,
    limit,
    rating: rating === "HAS_NOTES" ? undefined : rating,
    hasNotes: rating === "HAS_NOTES" ? true : undefined,
    search,
  });

  return NextResponse.json(result);
}
