import { checkAppAccess } from "@allonfire/auth/guard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Generate" };

import { getSelectedTopicsPaginated } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { GenerateClient } from "@/features/generation/components/generate-client";
import { ViewerBanner } from "@/features/sidebar-layout/components/viewer-banner";
import { auth } from "@/lib/auth";

const VALID_RATINGS = ["POSITIVE", "NEGATIVE", "HAS_NOTES"] as const;

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ rating?: string }>;
}) {
  const { user } = await checkAppAccess(auth, "social");
  const { rating: rawRating } = await searchParams;
  const validRating = VALID_RATINGS.includes(
    rawRating as (typeof VALID_RATINGS)[number]
  )
    ? (rawRating as (typeof VALID_RATINGS)[number])
    : undefined;

  function buildRatingFilter(rating: typeof validRating) {
    if (rating === "HAS_NOTES") {
      return { hasNotes: true as const };
    }
    if (rating) {
      return { rating };
    }
    return {};
  }

  const initialData = await getSelectedTopicsPaginated({
    ...buildRatingFilter(validRating),
  });
  const totalCount = initialData.totalCount ?? 0;

  const totalPrompts = initialData.topics.reduce(
    (sum, t) => sum + t.prompts.length,
    0
  );

  const showEmptyState = !validRating && totalCount === 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-2xl tracking-tight">Generate</h1>
          {totalCount > 0 && (
            <Badge variant="secondary">{totalCount} selected</Badge>
          )}
          {totalPrompts > 0 && (
            <Badge className="bg-primary text-primary-foreground">
              {totalPrompts === 1 ? "1 prompt" : `${totalPrompts} prompts`}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Selected topics queued for prompt generation.
        </p>
      </div>

      {user.role === "VIEWER" && <ViewerBanner />}

      {showEmptyState ? (
        <EmptyState
          description="Select topics from the Discover page to queue them for prompt generation."
          icon={Sparkles}
          title="No topics selected"
        />
      ) : (
        <GenerateClient
          initialData={initialData}
          initialRating={validRating ?? ""}
          role={user.role}
        />
      )}
    </div>
  );
}
