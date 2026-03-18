import { getDiscoveredTopicsPaginated } from "@allonfire/database";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { DiscoverClient } from "@/features/topics/components/discover-client";

export default async function DiscoverPage() {
  const initialData = await getDiscoveredTopicsPaginated();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Discover</h1>
        <p className="text-muted-foreground text-sm">
          Browse and select topics for content generation.
        </p>
      </div>

      {initialData.totalCount === 0 ? (
        <EmptyState
          description="n8n will automatically discover trending topics and populate this feed. Check your workflow settings if this stays empty."
          icon={Compass}
          title="No topics discovered yet"
        />
      ) : (
        <DiscoverClient initialData={initialData} />
      )}
    </div>
  );
}
