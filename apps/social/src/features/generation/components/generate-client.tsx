"use client";

import { Badge } from "@allonfire/ui/components/badge";
import { cn } from "@allonfire/ui/lib/utils";
import { Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { deleteAllSelectedTopicsAction } from "@/features/topics/actions/topics";
import { DeleteAllDialog } from "@/features/topics/components/delete-all-dialog";
import { TopicCard } from "@/features/topics/components/topic-card";
import { TopicList } from "@/features/topics/components/topic-list";
import { getCategoryColor } from "@/features/topics/components/topic-utils";
import { useTopicsPaginated } from "@/features/topics/hooks/use-topics-paginated";
import type {
  PaginatedTopicResult,
  TopicWithPrompts,
} from "@/features/topics/types/topic-types";
import { GenerateFilters, RATINGS } from "./generate-filters";
import { GenerateActions } from "./topic-card-generate-actions";

type GenerateClientProps = {
  initialData: PaginatedTopicResult<TopicWithPrompts>;
  initialRating: string;
  role: string;
};

export function GenerateClient({
  initialData,
  initialRating,
  role,
}: GenerateClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rating, setRating] = useState(searchParams.get("rating") ?? "");
  const [search, setSearch] = useState("");

  const matchesInitialFetch = rating === initialRating && search === "";

  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams();
    if (rating) {
      params.set("rating", rating);
    }
    if (search && search.length >= 2) {
      params.set("search", search);
    }
    return params;
  }, [rating, search]);

  const {
    allTopics,
    totalCount,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    invalidateQueries,
  } = useTopicsPaginated<TopicWithPrompts>({
    endpoint: "/api/topics/generate",
    queryKey: "generate-topics",
    buildSearchParams,
    initialData,
    matchesInitialFetch,
  });

  const handleRatingChange = useCallback(
    (value: string) => {
      setRating(value);
      router.replace(`/generate${value ? `?rating=${value}` : ""}`, {
        scroll: false,
      });
    },
    [router]
  );

  const deleteDescription = useMemo(() => {
    const hasNotes = rating === "HAS_NOTES";
    if (hasNotes) {
      return `This will permanently delete all ${totalCount} selected topics with noted prompts.`;
    }
    if (rating) {
      const ratingLabel =
        RATINGS.find((r) => r.value === rating)?.label?.toLowerCase() ??
        "filtered";
      return `This will permanently delete all ${totalCount} selected topics with ${ratingLabel}-rated prompts.`;
    }
    return `This will permanently delete all ${totalCount} selected topics.`;
  }, [rating, totalCount]);

  const handleDeleteConfirm = useCallback(
    () =>
      deleteAllSelectedTopicsAction({
        rating:
          rating === "HAS_NOTES"
            ? undefined
            : (rating as "POSITIVE" | "NEGATIVE") || undefined,
        hasNotes: rating === "HAS_NOTES" ? true : undefined,
      }),
    [rating]
  );

  return (
    <div className="space-y-4">
      <GenerateFilters
        deleteButton={
          <DeleteAllDialog
            count={totalCount}
            description={deleteDescription}
            disabled={role === "VIEWER"}
            onConfirm={handleDeleteConfirm}
            onDeleted={invalidateQueries}
            title="Delete selected topics?"
          />
        }
        onRatingChange={handleRatingChange}
        onSearchChange={setSearch}
        rating={rating}
        search={search}
      />

      <TopicList<TopicWithPrompts>
        emptyDescription="No topics match your current filters. Try adjusting your search or filter selection."
        emptyIcon={Sparkles}
        emptyTitle="No topics found"
        filterKey={`${rating}-${search}`}
        hasNextPage={hasNextPage}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={fetchNextPage}
        renderCard={(topic) => (
          <TopicCard
            onClick={() => router.push(`/generate/${topic.id}`)}
            renderActions={(props) => (
              <GenerateActions
                {...props}
                onAction={invalidateQueries}
                role={role}
              />
            )}
            renderMetaEnd={
              <Badge
                className={cn("ml-auto", getCategoryColor(topic.category))}
                variant="secondary"
              >
                {topic.prompts.length}{" "}
                {topic.prompts.length === 1 ? "prompt" : "prompts"}
              </Badge>
            }
            topic={topic}
          />
        )}
        topics={allTopics}
      />
    </div>
  );
}
