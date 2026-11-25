// @module-tag unit
import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { QUERY } from "@/shared/constants/query";
import { invalidateGallery } from "../gallery-mutations";

vi.mock("@/features/gallery/actions/favorite", () => ({
  setFavorite: vi.fn(),
}));
vi.mock("@/features/gallery/actions/remove-photo", () => ({
  removePhoto: vi.fn(),
}));

const CURSORS = [null, "next"] as const;
const OUTSIDE = ["games", "leaderboard"] as const;

/** A static feed with both pages loaded, a counting read behind it. */
const feedWatched = async (queryKey: readonly string[]) => {
  const queryClient = new QueryClient();
  const reads: (string | null)[] = [];
  const observer = new InfiniteQueryObserver<
    { next: string | null },
    Error,
    unknown,
    readonly string[],
    string | null
  >(queryClient, {
    getNextPageParam: ({ next }) => next,
    initialPageParam: null,
    queryFn: ({ pageParam }) => {
      reads.push(pageParam);
      return Promise.resolve({ next: pageParam === null ? CURSORS[1] : null });
    },
    queryKey,
    staleTime: "static",
  });
  const unsubscribe = observer.subscribe(() => undefined);
  await vi.waitFor(() => {
    if (observer.getCurrentResult().data === undefined) {
      throw new Error("page one is not loaded");
    }
  });
  await observer.fetchNextPage();
  reads.length = 0;
  return { queryClient, reads, unsubscribe };
};

describe("invalidateGallery, after an upload", () => {
  it.each([
    ["Gallery", QUERY.GALLERY.FEED],
    ["Favorites", QUERY.FAVORITES.FEED],
  ])(
    "reads the %s feed on screen again, both pages in order",
    async (_name, key) => {
      const { queryClient, reads, unsubscribe } = await feedWatched(key);
      // The regression this call exists for: a bare invalidation skips static queries.
      await queryClient.invalidateQueries({ queryKey: QUERY.GALLERY.ALL });
      expect(reads).toEqual([]);
      await invalidateGallery(queryClient);
      expect(reads).toEqual([...CURSORS]);
      unsubscribe();
    }
  );

  it("drops a feed nothing watches, so the next visit hydrates a fresh first page", async () => {
    const { queryClient, unsubscribe } = await feedWatched(QUERY.GALLERY.FEED);
    unsubscribe();
    await invalidateGallery(queryClient);
    expect(queryClient.getQueryData(QUERY.GALLERY.FEED)).toBeUndefined();
  });

  it("leaves a query outside the Gallery alone", async () => {
    const { queryClient, reads, unsubscribe } = await feedWatched(OUTSIDE);
    await invalidateGallery(queryClient);
    expect(reads).toEqual([]);
    unsubscribe();
  });
});
