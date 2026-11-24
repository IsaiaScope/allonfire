// @module-tag unit
import type { ApiType } from "@allonfire/api/client";
import { LOCAL } from "@allonfire/config/local/addresses";
import { answeringApi } from "@allonfire/core/features/next/api/tests/answering-api";
import {
  InfiniteQueryObserver,
  type MutationOptions,
  QueryClient,
} from "@tanstack/react-query";
import { hc } from "hono/client";
import { QUERY } from "@/shared/constants/query";
import { FAVORITES_PAGE, GALLERY_PAGE } from "@/shared/tests/msw/handlers";
import { setFavorite } from "../../actions/favorite";
import { removePhoto } from "../../actions/remove-photo";
import { photosOf } from "../feed-patch";
import {
  favoriteMutation,
  invalidateGallery,
  removePhotoMutation,
} from "../gallery-mutations";
import {
  favoritesFeedQuery,
  type GalleryFeed,
  galleryFeedQuery,
} from "../gallery-queries";

vi.mock("../../actions/favorite", () => ({ setFavorite: vi.fn() }));
vi.mock("../../actions/remove-photo", () => ({ removePhoto: vi.fn() }));

const GALLERY_FEED: GalleryFeed = { pageParams: [null], pages: [GALLERY_PAGE] };
const FAVORITES_FEED: GalleryFeed = {
  pageParams: [null],
  pages: [FAVORITES_PAGE],
};
const MARKED = "photo-a";
const UNMARKED = "photo-b";

const seeded = () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(QUERY.GALLERY.FEED, GALLERY_FEED);
  queryClient.setQueryData(QUERY.FAVORITES.FEED, FAVORITES_FEED);
  return queryClient;
};
const run = <TData, TVariables, TContext>(
  queryClient: QueryClient,
  mutation: MutationOptions<TData, Error, TVariables, TContext>,
  variables: TVariables
) =>
  queryClient
    .getMutationCache()
    .build(queryClient, mutation)
    .execute(variables);
const galleryFlag = (queryClient: QueryClient, id: string) =>
  photosOf(queryClient.getQueryData<GalleryFeed>(QUERY.GALLERY.FEED)).find(
    (item) => item.id === id
  )?.favorite;
const favoriteIds = (queryClient: QueryClient) =>
  photosOf(queryClient.getQueryData<GalleryFeed>(QUERY.FAVORITES.FEED)).map(
    ({ id }) => id
  );

/** An action held open until `release`, so a test reads the cache while it is in flight. */
const held = <TResult>() => {
  let release: (result: TResult | null) => void = () => undefined;
  const promise = new Promise<TResult | null>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

beforeEach(() => {
  vi.mocked(setFavorite).mockReset();
  vi.mocked(removePhoto).mockReset();
});

describe("favoriteMutation", () => {
  it("marks: sets the flag in the Gallery feed before the action settles, and calls the action with the new state", async () => {
    const action = held<{ favorite: boolean }>();
    vi.mocked(setFavorite).mockReturnValueOnce(action.promise);
    const queryClient = seeded();
    const done = run(queryClient, favoriteMutation(UNMARKED), true);
    await vi.waitFor(() =>
      expect(galleryFlag(queryClient, UNMARKED)).toBe(true)
    );
    expect(setFavorite).toHaveBeenCalledWith(UNMARKED, true);
    // Marking leaves the Favorites feed alone: the server copy arrives with the refetch.
    expect(favoriteIds(queryClient)).toEqual([MARKED]);
    action.release({ favorite: true });
    await done;
  });

  it("unmarks: sets the flag and takes the tile out of the Favorites feed at once", async () => {
    const action = held<{ favorite: boolean }>();
    vi.mocked(setFavorite).mockReturnValueOnce(action.promise);
    const queryClient = seeded();
    const done = run(queryClient, favoriteMutation(MARKED), false);
    await vi.waitFor(() =>
      expect(galleryFlag(queryClient, MARKED)).toBe(false)
    );
    expect(favoriteIds(queryClient)).toEqual([]);
    action.release({ favorite: false });
    await done;
  });

  it("restores both feeds and rejects when the action answers null", async () => {
    vi.mocked(setFavorite).mockResolvedValueOnce(null);
    const queryClient = seeded();
    await expect(
      run(queryClient, favoriteMutation(MARKED), false)
    ).rejects.toThrow();
    expect(queryClient.getQueryData(QUERY.GALLERY.FEED)).toEqual(GALLERY_FEED);
    expect(queryClient.getQueryData(QUERY.FAVORITES.FEED)).toEqual(
      FAVORITES_FEED
    );
  });

  it("runs two quick toggles of one photo one after the other", async () => {
    const first = held<{ favorite: boolean }>();
    const calls: boolean[] = [];
    vi.mocked(setFavorite)
      .mockImplementationOnce((_id, favorite) => {
        calls.push(favorite);
        return first.promise;
      })
      .mockImplementationOnce((_id, favorite) => {
        calls.push(favorite);
        return Promise.resolve({ favorite });
      });
    const queryClient = seeded();
    const one = run(queryClient, favoriteMutation(UNMARKED), true);
    const two = run(queryClient, favoriteMutation(UNMARKED), false);
    await vi.waitFor(() => expect(calls).toEqual([true]));
    first.release({ favorite: true });
    await Promise.all([one, two]);
    expect(calls).toEqual([true, false]);
  });
});

describe("removePhotoMutation", () => {
  it("takes the photo out of both feeds at once", async () => {
    const action = held<number>();
    vi.mocked(removePhoto).mockReturnValueOnce(action.promise);
    const queryClient = seeded();
    const done = run(queryClient, removePhotoMutation, MARKED);
    await vi.waitFor(() => expect(favoriteIds(queryClient)).toEqual([]));
    expect(
      photosOf(queryClient.getQueryData<GalleryFeed>(QUERY.GALLERY.FEED)).map(
        ({ id }) => id
      )
    ).toEqual(["photo-b", "photo-c"]);
    expect(removePhoto).toHaveBeenCalledWith(MARKED);
    action.release(1);
    await done;
  });

  it("puts it back in both feeds when the action answers null", async () => {
    vi.mocked(removePhoto).mockResolvedValueOnce(null);
    const queryClient = seeded();
    await expect(
      run(queryClient, removePhotoMutation, MARKED)
    ).rejects.toThrow();
    expect(queryClient.getQueryData(QUERY.GALLERY.FEED)).toEqual(GALLERY_FEED);
    expect(queryClient.getQueryData(QUERY.FAVORITES.FEED)).toEqual(
      FAVORITES_FEED
    );
  });
});

describe("a loaded feed that is on screen", () => {
  /** A Gallery feed with two pages loaded, watched as the feed component watches it. */
  const watched = async (feedQuery = galleryFeedQuery) => {
    const { client, seen } = answeringApi(
      hc<ApiType>,
      LOCAL.URL.TEST_API,
      GALLERY_PAGE
    );
    const queryClient = new QueryClient();
    const observer = new InfiniteQueryObserver(queryClient, feedQuery(client));
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => {
      if (observer.getCurrentResult().data === undefined) {
        throw new Error("page one is not loaded");
      }
    });
    await observer.fetchNextPage();
    return { observer, queryClient, seen, unsubscribe };
  };
  const cursorsOf = (seen: URL[]) =>
    seen.map((url) => url.searchParams.get("cursor"));

  it("is not read again when a toggle settles: the patch made it exact", async () => {
    vi.mocked(setFavorite).mockResolvedValueOnce({ favorite: true });
    const { queryClient, seen, unsubscribe } = await watched();
    seen.length = 0;
    await run(queryClient, favoriteMutation(UNMARKED), true);
    expect(seen).toEqual([]);
    unsubscribe();
  });

  it("is not read again when a photo is removed: the patch made it exact", async () => {
    vi.mocked(removePhoto).mockResolvedValueOnce(1);
    const { queryClient, seen, unsubscribe } = await watched();
    seen.length = 0;
    await run(queryClient, removePhotoMutation, UNMARKED);
    expect(seen).toEqual([]);
    unsubscribe();
  });

  it("is read again, every loaded page in order, when the toggle is refused", async () => {
    vi.mocked(setFavorite).mockResolvedValueOnce(null);
    const { queryClient, seen, unsubscribe } = await watched();
    seen.length = 0;
    await run(queryClient, favoriteMutation(UNMARKED), true).catch(
      () => undefined
    );
    expect(cursorsOf(seen)).toEqual([null, GALLERY_PAGE.nextCursor]);
    unsubscribe();
  });

  it("holds a Favorites feed on screen as it is when a photo is cleared, and reads it when one is marked", async () => {
    vi.mocked(setFavorite).mockResolvedValue({ favorite: true });
    const { queryClient, seen, unsubscribe } =
      await watched(favoritesFeedQuery);
    seen.length = 0;
    await run(queryClient, favoriteMutation(MARKED), false);
    expect(seen).toEqual([]);
    await run(queryClient, favoriteMutation(UNMARKED), true);
    expect(cursorsOf(seen)).toEqual([null, GALLERY_PAGE.nextCursor]);
    unsubscribe();
  });

  it("is read again by invalidateGallery, once per loaded page", async () => {
    const { queryClient, seen, unsubscribe } = await watched();
    seen.length = 0;
    await invalidateGallery(queryClient);
    expect(cursorsOf(seen)).toEqual([null, GALLERY_PAGE.nextCursor]);
    unsubscribe();
  });

  it("is dropped by invalidateGallery once nothing watches it, so the next visit hydrates a fresh first page", async () => {
    const { queryClient, unsubscribe } = await watched();
    unsubscribe();
    await invalidateGallery(queryClient);
    expect(queryClient.getQueryData(QUERY.GALLERY.FEED)).toBeUndefined();
  });
});
