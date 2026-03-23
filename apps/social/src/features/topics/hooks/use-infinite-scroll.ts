import type { RefObject } from "react";
import { useEffect } from "react";

type UseInfiniteScrollOptions = {
  sentinelRef: RefObject<HTMLDivElement | null>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onFetchNextPage: () => void;
  rootMargin?: string;
};

export function useInfiniteScroll({
  sentinelRef,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  rootMargin = "200px",
}: UseInfiniteScrollOptions) {
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
      { rootMargin }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    sentinelRef,
    hasNextPage,
    isFetchingNextPage,
    onFetchNextPage,
    rootMargin,
  ]);
}
