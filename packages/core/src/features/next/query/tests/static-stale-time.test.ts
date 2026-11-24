// @module-tag unit

import { QueryClient, QueryObserver } from "@tanstack/react-query";

// Characterization of the installed TanStack: an active query read with
// `staleTime: "static"` is never refetched by `invalidateQueries`, which is why
// core's `invalidateStatic` exists. A TanStack upgrade that changes a row turns
// this file red, and the reasoning in the Laura Phase 4 plan is revisited.

const KEY = ["probe"] as const;

/** One active observer, then `act`; answers how many fetches ran in all. */
const fetchesAfter = async (
  staleTime: number | "static",
  act: (queryClient: QueryClient) => Promise<unknown> | unknown
) => {
  const queryClient = new QueryClient();
  const queryFn = vi.fn(() => Promise.resolve("data"));
  const observer = new QueryObserver(queryClient, {
    queryFn,
    queryKey: KEY,
    staleTime,
  });
  const stop = observer.subscribe(() => undefined);
  // The first answer must be in the cache: an invalidation during the first
  // fetch is folded into it and would count as no refetch for any staleTime.
  await vi.waitUntil(() => queryClient.getQueryData(KEY) === "data");
  await act(queryClient);
  stop();
  return {
    data: queryClient.getQueryData(KEY),
    fetches: queryFn.mock.calls.length,
  };
};

describe("an active query observed with staleTime 'static'", () => {
  it("is not refetched by invalidateQueries", async () => {
    const { fetches } = await fetchesAfter("static", (queryClient) =>
      queryClient.invalidateQueries({ queryKey: KEY })
    );
    expect(fetches).toBe(1);
  });

  it("is wiped, not refetched, by resetQueries", async () => {
    const { data, fetches } = await fetchesAfter("static", (queryClient) =>
      queryClient.resetQueries({ queryKey: KEY })
    );
    expect({ data, fetches }).toEqual({ data: undefined, fetches: 1 });
  });

  it("is not refetched by removeQueries", async () => {
    const { fetches } = await fetchesAfter("static", (queryClient) =>
      queryClient.removeQueries({ queryKey: KEY })
    );
    expect(fetches).toBe(1);
  });
});

describe("an active query with a numeric staleTime", () => {
  it("is refetched by invalidateQueries", async () => {
    const { fetches } = await fetchesAfter(300_000, (queryClient) =>
      queryClient.invalidateQueries({ queryKey: KEY })
    );
    expect(fetches).toBe(2);
  });
});

describe("a static query whose observer is gone", () => {
  it("is invalidated but not refetched when a new observer mounts", async () => {
    const queryClient = new QueryClient();
    const queryFn = vi.fn(() => Promise.resolve("data"));
    const options = { queryFn, queryKey: KEY, staleTime: "static" } as const;
    const stop = new QueryObserver(queryClient, options).subscribe(
      () => undefined
    );
    await vi.waitUntil(() => queryClient.getQueryData(KEY) === "data");
    stop();
    await queryClient.invalidateQueries({ queryKey: KEY });
    const again = new QueryObserver(queryClient, options).subscribe(
      () => undefined
    );
    await Promise.resolve();
    expect(queryFn).toHaveBeenCalledTimes(1);
    again();
  });
});
