"use client";

import type { Topic } from "@allonfire/database";
import { Skeleton } from "@allonfire/ui/components/skeleton";
import { Compass } from "lucide-react";
import { useEffect, useRef } from "react";
import { EmptyState } from "@/components/empty-state";
import { TopicCard } from "./topic-card";
import { DiscoverActions } from "./topic-card-discover-actions";

type TopicListProps = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onAction: () => void;
  onFetchNextPage: () => void;
  topics: Topic[];
};

export function TopicList({
  hasNextPage,
  isFetchingNextPage,
  onAction,
  onFetchNextPage,
  topics,
}: TopicListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          onFetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onFetchNextPage]);

  if (topics.length === 0 && !isFetchingNextPage) {
    return (
      <EmptyState
        description="No topics match your current filters. Try adjusting your search or category selection."
        icon={Compass}
        title="No topics found"
      />
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        {topics.map((topic) => (
          <TopicCard
            key={topic.id}
            renderActions={(props) => (
              <DiscoverActions {...props} onAction={onAction} />
            )}
            topic={topic}
          />
        ))}

        {isFetchingNextPage &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              className="space-y-3 rounded-lg border bg-card p-4"
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              key={`skeleton-${i}`}
            >
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ))}
      </div>

      <div ref={sentinelRef} />
    </div>
  );
}
