import { checkAppAccess } from "@allonfire/auth/guard";
import type { TopicCategory } from "@allonfire/database";
import { getDiscoveredTopicsPaginated } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ViewerBanner } from "@/features/sidebar-layout/components/viewer-banner";
import { DiscoverClient } from "@/features/topics/components/discover-client";
import { auth } from "@/lib/auth";

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
  const { user } = await checkAppAccess(auth, "social");
  const { category: rawCategory } = await searchParams;
  const validCategory = VALID_CATEGORIES.includes(
    rawCategory as (typeof VALID_CATEGORIES)[number]
  )
    ? (rawCategory as TopicCategory)
    : undefined;

  const initialData = await getDiscoveredTopicsPaginated({
    ...(validCategory && { category: validCategory }),
  });
  const totalCount = initialData.totalCount ?? 0;

  const showEmptyState = !validCategory && totalCount === 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-2xl tracking-tight">Discover</h1>
          {totalCount > 0 && (
            <Badge variant="secondary">{totalCount} AI picked</Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Browse and select topics for content generation.
        </p>
      </div>

      {user.role === "VIEWER" && <ViewerBanner />}

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
          role={user.role}
        />
      )}
    </div>
  );
}
