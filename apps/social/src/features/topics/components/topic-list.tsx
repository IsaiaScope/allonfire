"use client";

import type { Topic } from "@allonfire/database";
import { m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Compass } from "lucide-react";
import type { ReactNode } from "react";
import { useRef } from "react";
import { EmptyState } from "@/components/empty-state";
import { useInfiniteScroll } from "@/features/topics/hooks/use-infinite-scroll";
import { fadeInUp, staggerContainer } from "@/lib/animation-variants";
import { TopicCardSkeleton } from "./topic-card-skeleton";

type TopicListProps<T extends Topic = Topic> = {
  topics: T[];
  filterKey: string;
  hasNextPage: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  onFetchNextPage: () => void;
  renderCard: (topic: T) => ReactNode;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function TopicList<T extends Topic = Topic>({
  topics,
  filterKey,
  hasNextPage,
  isFetching,
  isFetchingNextPage,
  onFetchNextPage,
  renderCard,
  emptyIcon: EmptyIcon = Compass,
  emptyTitle = "No topics found",
  emptyDescription = "No topics match your current filters. Try adjusting your search or filter selection.",
}: TopicListProps<T>) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useInfiniteScroll({
    sentinelRef,
    hasNextPage,
    isFetchingNextPage,
    onFetchNextPage,
  });

  if (topics.length === 0 && !isFetchingNextPage && !isFetching) {
    return (
      <EmptyState
        description={emptyDescription}
        icon={EmptyIcon}
        title={emptyTitle}
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
            {renderCard(topic)}
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
