import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { PaginatedTopicResult } from "@/features/topics/types/topic-types";
import { api } from "@/lib/api-client";

type UseTopicsPaginatedOptions<TTopic> = {
  endpoint: string;
  queryKey: string;
  buildSearchParams: () => URLSearchParams;
  initialData?: PaginatedTopicResult<TTopic>;
  matchesInitialFetch: boolean;
  invalidateKeys?: readonly string[];
};

export function useTopicsPaginated<TTopic>({
  endpoint,
  queryKey,
  buildSearchParams,
  initialData,
  matchesInitialFetch,
  invalidateKeys,
}: UseTopicsPaginatedOptions<TTopic>) {
  const queryClient = useQueryClient();

  const paramsKey = buildSearchParams().toString();

  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: [queryKey, paramsKey],
      queryFn: ({ pageParam }) => {
        const params = new URLSearchParams(paramsKey);
        if (pageParam) {
          params.set("cursor", pageParam);
        }
        return api.get<PaginatedTopicResult<TTopic>>(
          endpoint,
          Object.fromEntries(params)
        );
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined as string | undefined,
      ...(matchesInitialFetch &&
        initialData && {
          initialData: {
            pages: [initialData],
            pageParams: [undefined],
          },
        }),
    });

  const allTopics = useMemo(
    () => data?.pages.flatMap((page) => page.topics) ?? [],
    [data]
  );

  const totalCount = data?.pages[0]?.totalCount ?? initialData?.totalCount ?? 0;

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    if (invalidateKeys) {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    }
  }, [queryClient, queryKey, invalidateKeys]);

  return {
    allTopics,
    totalCount,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    invalidateQueries,
  };
}
