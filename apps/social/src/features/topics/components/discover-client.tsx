"use client";

import type { Topic } from "@allonfire/database";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useTopicsPaginated } from "@/features/topics/hooks/use-topics-paginated";
import type { PaginatedTopicResult } from "@/features/topics/types/topic-types";
import { deleteAllTopicsAction } from "../actions/topics";
import { DeleteAllDialog } from "./delete-all-dialog";
import { CATEGORIES, DiscoverFilters } from "./discover-filters";
import { TopicCard } from "./topic-card";
import { DiscoverActions } from "./topic-card-discover-actions";
import { TopicList } from "./topic-list";

const CROSS_INVALIDATE_KEYS = ["generate-topics"] as const;

type DiscoverClientProps = {
  initialCategory: string;
  initialData: PaginatedTopicResult<Topic>;
};

export function DiscoverClient({
  initialCategory,
  initialData,
}: DiscoverClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  const matchesInitialFetch =
    category === initialCategory && search === "" && sort === "newest";

  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams();
    if (category) {
      params.set("category", category);
    }
    if (search && search.length >= 2) {
      params.set("search", search);
    }
    if (sort) {
      params.set("sort", sort);
    }
    return params;
  }, [category, search, sort]);

  const {
    allTopics,
    totalCount,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    invalidateQueries,
  } = useTopicsPaginated<Topic>({
    endpoint: "/api/topics/discover",
    queryKey: "discover-topics",
    buildSearchParams,
    initialData,
    matchesInitialFetch,
    invalidateKeys: CROSS_INVALIDATE_KEYS,
  });

  const handleCategoryChange = useCallback(
    (cat: string) => {
      setCategory(cat);
      router.replace(`/discover${cat ? `?category=${cat}` : ""}`, {
        scroll: false,
      });
    },
    [router]
  );

  const categoryLabel = useMemo(
    () =>
      category
        ? CATEGORIES.find((c) => c.value === category)?.label
        : undefined,
    [category]
  );

  const handleDeleteConfirm = useCallback(
    () => deleteAllTopicsAction(category || undefined),
    [category]
  );

  return (
    <div className="space-y-4">
      <DiscoverFilters
        category={category}
        deleteButton={
          <DeleteAllDialog
            count={totalCount}
            description={
              categoryLabel
                ? `This will permanently delete all ${totalCount} discovered ${categoryLabel} topics. Topics selected for generation will not be affected.`
                : `This will permanently delete all ${totalCount} discovered topics. Topics selected for generation will not be affected.`
            }
            onConfirm={handleDeleteConfirm}
            onDeleted={invalidateQueries}
            title={
              categoryLabel
                ? `Delete ${categoryLabel} topics?`
                : "Delete all topics?"
            }
          />
        }
        onCategoryChange={handleCategoryChange}
        onSearchChange={setSearch}
        onSortChange={setSort}
        search={search}
        sort={sort}
      />

      <TopicList
        filterKey={`${category}-${search}-${sort}`}
        hasNextPage={hasNextPage}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={fetchNextPage}
        renderCard={(topic) => (
          <TopicCard
            renderActions={(props) => (
              <DiscoverActions {...props} onAction={invalidateQueries} />
            )}
            topic={topic}
          />
        )}
        topics={allTopics}
      />
    </div>
  );
}
