import type { TopicCategory } from "@allonfire/database";
import { getDiscoveredTopicsPaginated } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { DiscoverClient } from "@/features/topics/components/discover-client";

const VALID_CATEGORIES = [
  "NEWS",
  "MEME_WORTHY",
  "LEARNING",
  "TOOL_RELEASE",
  "AI_UPDATE",
] as const;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: rawCategory } = await searchParams;
  const validCategory = VALID_CATEGORIES.includes(
    rawCategory as (typeof VALID_CATEGORIES)[number]
  )
    ? (rawCategory as TopicCategory)
    : undefined;

  const initialData = await getDiscoveredTopicsPaginated({
    ...(validCategory && { category: validCategory }),
  });

  const showEmptyState = !validCategory && initialData.totalCount === 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-2xl tracking-tight">Discover</h1>
          {initialData.totalCount > 0 && (
            <Badge variant="secondary">
              {initialData.totalCount} AI picked
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Browse and select topics for content generation.
        </p>
      </div>

      {showEmptyState ? (
        <EmptyState
          description="n8n will automatically discover trending topics and populate this feed. Check your workflow settings if this stays empty."
          icon={Compass}
          title="No topics discovered yet"
        />
      ) : (
        <DiscoverClient
          initialCategory={validCategory ?? ""}
          initialData={initialData}
        />
      )}
    </div>
  );
}
