"use client";

import { Badge } from "@allonfire/ui/components/badge";
import { cn } from "@allonfire/ui/lib/utils";
import { m } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { EmptyState } from "@/components/empty-state";
import { TopicCard } from "@/features/topics/components/topic-card";
import { TopicCardSkeleton } from "@/features/topics/components/topic-card-skeleton";
import { getCategoryColor } from "@/features/topics/components/topic-utils";
import { fadeInUp, staggerContainer } from "@/lib/animation-variants";
import type { TopicWithPrompts } from "./generate-client";
import { GenerateActions } from "./topic-card-generate-actions";

type GenerateTopicListProps = {
  filterKey: string;
  hasNextPage: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  onFetchNextPage: () => void;
  onAction: () => void;
  topics: TopicWithPrompts[];
};

export function GenerateTopicList({
  filterKey,
  hasNextPage,
  isFetching,
  isFetchingNextPage,
  onFetchNextPage,
  onAction,
  topics,
}: GenerateTopicListProps) {
  const router = useRouter();
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
        description="No topics match your current filters. Try adjusting your search or filter selection."
        icon={Sparkles}
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
              onClick={() => router.push(`/generate/${topic.id}`)}
              renderActions={(props) => (
                <GenerateActions {...props} onAction={onAction} />
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
