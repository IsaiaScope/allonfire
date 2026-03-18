"use client";

import type { Topic } from "@allonfire/database";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { DiscoverFilters } from "./discover-filters";
import { SelectionActionBar } from "./selection-action-bar";
import { TopicList } from "./topic-list";

type PaginatedResult = {
  nextCursor: string | null;
  topics: Topic[];
  totalCount: number;
};

type DiscoverClientProps = {
  initialData: PaginatedResult;
};

async function fetchTopics(params: {
  category: string;
  cursor?: string;
  search: string;
  sort: string;
}): Promise<PaginatedResult> {
  const searchParams = new URLSearchParams();
  if (params.cursor) {
    searchParams.set("cursor", params.cursor);
  }
  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.search && params.search.length >= 2) {
    searchParams.set("search", params.search);
  }
  if (params.sort) {
    searchParams.set("sort", params.sort);
  }

  const res = await fetch(`/api/topics/discover?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch topics");
  }
  return res.json();
}

export function DiscoverClient({ initialData }: DiscoverClientProps) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isDefaultFilters =
    category === "" && search === "" && sort === "newest";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["discover-topics", { category, search, sort }],
      queryFn: ({ pageParam }) =>
        fetchTopics({ cursor: pageParam, category, search, sort }),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      ...(isDefaultFilters && {
        initialData: {
          pages: [initialData],
          pageParams: [undefined],
        },
      }),
    });

  const allTopics = data?.pages.flatMap((page) => page.topics) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? initialData.totalCount;

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["discover-topics"] });
  }, [queryClient]);

  return (
    <div className="space-y-4">
      <DiscoverFilters
        category={category}
        onCategoryChange={setCategory}
        onSearchChange={setSearch}
        onSortChange={setSort}
        search={search}
        sort={sort}
        totalCount={totalCount}
      />

      <TopicList
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onAction={invalidateQueries}
        onFetchNextPage={fetchNextPage}
        onToggleSelect={handleToggleSelect}
        selectedIds={selectedIds}
        showBottomPadding={selectedIds.size > 0}
        topics={allTopics}
      />

      <SelectionActionBar
        onClearSelection={handleClearSelection}
        onGenerated={invalidateQueries}
        selectedIds={selectedIds}
      />
    </div>
  );
}
