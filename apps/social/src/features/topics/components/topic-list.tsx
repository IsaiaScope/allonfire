"use client";

import type { Topic } from "@allonfire/database";
import { m } from "framer-motion";
import { Compass } from "lucide-react";
import { useEffect, useRef } from "react";
import { EmptyState } from "@/components/empty-state";
import { fadeInUp, staggerContainer } from "@/lib/animation-variants";
import { TopicCard } from "./topic-card";
import { DiscoverActions } from "./topic-card-discover-actions";
import { TopicCardSkeleton } from "./topic-card-skeleton";

type TopicListProps = {
  filterKey: string;
  hasNextPage: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  onAction: () => void;
  onFetchNextPage: () => void;
  topics: Topic[];
};

export function TopicList({
  filterKey,
  hasNextPage,
  isFetching,
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

  if (topics.length === 0 && !isFetchingNextPage && !isFetching) {
    return (
      <EmptyState
        description="No topics match your current filters. Try adjusting your search or category selection."
        icon={Compass}
        title="No topics found"
      />
    );
  }

  if (topics.length === 0 && isFetching) {
    return (
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
          <TopicCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <m.div
        animate="visible"
        className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2"
        initial="hidden"
        key={filterKey}
        variants={staggerContainer}
      >
        {topics.map((topic) => (
          <m.div key={topic.id} variants={fadeInUp}>
            <TopicCard
              renderActions={(props) => (
                <DiscoverActions {...props} onAction={onAction} />
              )}
              topic={topic}
            />
          </m.div>
        ))}

        {isFetchingNextPage &&
          Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
            <TopicCardSkeleton key={`skeleton-${i}`} />
          ))}
      </m.div>

      <div ref={sentinelRef} />
    </div>
  );
}
