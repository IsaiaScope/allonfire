// @module-tag unit
import {
  InfiniteQueryObserver,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { invalidateStatic } from "../utils/invalidate-static";

const KEY = ["feed"] as const;
const OTHER = ["other"] as const;

/** The first answer has landed: an invalidation before it is folded into the fetch. */
const settled = (queryClient: QueryClient, key: readonly unknown[]) =>
  vi.waitUntil(() => queryClient.getQueryData(key) !== undefined);

describe("invalidateStatic", () => {
  it("reads an active static query again", async () => {
    const queryClient = new QueryClient();
    const queryFn = vi.fn(() => Promise.resolve("data"));
    const stop = new QueryObserver(queryClient, {
      queryFn,
      queryKey: KEY,
      staleTime: "static",
    }).subscribe(() => undefined);
    await settled(queryClient, KEY);
    await invalidateStatic(queryClient, KEY);
    expect(queryFn).toHaveBeenCalledTimes(2);
    stop();
  });

  it("reads every loaded page of an active static infinite query again, in order", async () => {
    const queryClient = new QueryClient();
    const cursors: (string | null)[] = [];
    const queryFn = vi.fn(({ pageParam }: { pageParam: string | null }) => {
      cursors.push(pageParam);
      return Promise.resolve({ next: pageParam === null ? "c1" : null });
    });
    const observer = new InfiniteQueryObserver(queryClient, {
      getNextPageParam: (last: { next: string | null }) =>
        last.next ?? undefined,
      initialPageParam: null as string | null,
      queryFn,
      queryKey: KEY,
      staleTime: "static",
    });
    const stop = observer.subscribe(() => undefined);
    await settled(queryClient, KEY);
    await observer.fetchNextPage();
    cursors.length = 0;
    await invalidateStatic(queryClient, KEY);
    expect(cursors).toEqual([null, "c1"]);
    stop();
  });

  it("reads an active numeric query again once, not twice", async () => {
    const queryClient = new QueryClient();
    const queryFn = vi.fn(() => Promise.resolve("data"));
    const stop = new QueryObserver(queryClient, {
      queryFn,
      queryKey: KEY,
      staleTime: 300_000,
    }).subscribe(() => undefined);
    await settled(queryClient, KEY);
    await invalidateStatic(queryClient, KEY);
    expect(queryFn).toHaveBeenCalledTimes(2);
    stop();
  });

  it("removes an inactive static query and keeps an inactive numeric one, invalidated", async () => {
    const queryClient = new QueryClient();
    const staticKey = [...KEY, "static"] as const;
    const numericKey = [...KEY, "numeric"] as const;
    const queryFn = () => Promise.resolve("data");
    const stopStatic = new QueryObserver(queryClient, {
      queryFn,
      queryKey: staticKey,
      staleTime: "static",
    }).subscribe(() => undefined);
    const stopNumeric = new QueryObserver(queryClient, {
      queryFn,
      queryKey: numericKey,
      staleTime: 300_000,
    }).subscribe(() => undefined);
    await settled(queryClient, staticKey);
    await settled(queryClient, numericKey);
    stopStatic();
    stopNumeric();
    await invalidateStatic(queryClient, KEY);
    expect(queryClient.getQueryState(staticKey)).toBeUndefined();
    expect(queryClient.getQueryState(numericKey)?.isInvalidated).toBe(true);
  });

  it("leaves a query under another key alone", async () => {
    const queryClient = new QueryClient();
    const queryFn = vi.fn(() => Promise.resolve("data"));
    const stop = new QueryObserver(queryClient, {
      queryFn,
      queryKey: OTHER,
      staleTime: "static",
    }).subscribe(() => undefined);
    await settled(queryClient, OTHER);
    await invalidateStatic(queryClient, KEY);
    expect(queryFn).toHaveBeenCalledTimes(1);
    stop();
  });

  it("resolves when the key matches nothing", async () => {
    await expect(
      invalidateStatic(new QueryClient(), KEY)
    ).resolves.toBeUndefined();
  });

  it("still calls invalidateQueries with the key", async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    await invalidateStatic(queryClient, KEY);
    expect(spy).toHaveBeenCalledWith({ queryKey: KEY });
  });
});

describe("invalidateStatic with keep", () => {
  it("keeps an active static query under `keep` as it is, and reads the others", async () => {
    const queryClient = new QueryClient();
    const keptKey = [...KEY, "kept"] as const;
    const readKey = [...KEY, "read"] as const;
    const kept = vi.fn(() => Promise.resolve("data"));
    const read = vi.fn(() => Promise.resolve("data"));
    const stopKept = new QueryObserver(queryClient, {
      queryFn: kept,
      queryKey: keptKey,
      staleTime: "static",
    }).subscribe(() => undefined);
    const stopRead = new QueryObserver(queryClient, {
      queryFn: read,
      queryKey: readKey,
      staleTime: "static",
    }).subscribe(() => undefined);
    await settled(queryClient, keptKey);
    await settled(queryClient, readKey);
    await invalidateStatic(queryClient, KEY, { keep: [keptKey] });
    expect(kept).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledTimes(2);
    stopKept();
    stopRead();
  });

  it("still removes an inactive static query that `keep` names", async () => {
    const queryClient = new QueryClient();
    const stop = new QueryObserver(queryClient, {
      queryFn: () => Promise.resolve("data"),
      queryKey: KEY,
      staleTime: "static",
    }).subscribe(() => undefined);
    await settled(queryClient, KEY);
    stop();
    await invalidateStatic(queryClient, KEY, { keep: [KEY] });
    expect(queryClient.getQueryState(KEY)).toBeUndefined();
  });
});
