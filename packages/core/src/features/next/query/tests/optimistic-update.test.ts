// @module-tag unit
import { QueryClient } from "@tanstack/react-query";
import { optimisticUpdate } from "../utils/optimistic-update";

const PAGES = ["things", "page"] as const;
const FIRST = [...PAGES, { page: 1 }] as const;
const SECOND = [...PAGES, { page: 2 }] as const;
const OUTSIDE = ["others", "page"] as const;

type Numbers = number[];
const doubled = (cached: Numbers) => cached.map((value) => value * 2);

describe("optimisticUpdate", () => {
  it("patches one cached query and the rollback restores it", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(FIRST, [1, 2]);
    const rollback = await optimisticUpdate<Numbers>(
      queryClient,
      PAGES,
      doubled
    );
    expect(queryClient.getQueryData(FIRST)).toEqual([2, 4]);
    rollback();
    expect(queryClient.getQueryData(FIRST)).toEqual([1, 2]);
  });

  it("patches every query under the prefix and restores them all", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(FIRST, [1]);
    queryClient.setQueryData(SECOND, [5]);
    const rollback = await optimisticUpdate<Numbers>(
      queryClient,
      PAGES,
      doubled
    );
    expect(queryClient.getQueryData(FIRST)).toEqual([2]);
    expect(queryClient.getQueryData(SECOND)).toEqual([10]);
    rollback();
    expect(queryClient.getQueryData(FIRST)).toEqual([1]);
    expect(queryClient.getQueryData(SECOND)).toEqual([5]);
  });

  it("hands the patch each query's own key", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(FIRST, [1]);
    queryClient.setQueryData(SECOND, [1]);
    const keys: unknown[] = [];
    await optimisticUpdate<Numbers>(queryClient, PAGES, (cached, key) => {
      keys.push(key);
      return cached;
    });
    expect(keys).toEqual(expect.arrayContaining([FIRST, SECOND]));
    expect(keys).toHaveLength(2);
  });

  it("leaves a query outside the prefix alone", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(OUTSIDE, [1]);
    await optimisticUpdate<Numbers>(queryClient, PAGES, doubled);
    expect(queryClient.getQueryData(OUTSIDE)).toEqual([1]);
  });

  it("skips a query under the prefix that holds no data", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryDefaults(FIRST, { staleTime: 1 });
    queryClient.getQueryCache().build(queryClient, { queryKey: FIRST });
    const rollback = await optimisticUpdate<Numbers>(
      queryClient,
      PAGES,
      doubled
    );
    expect(queryClient.getQueryData(FIRST)).toBeUndefined();
    rollback();
    expect(queryClient.getQueryData(FIRST)).toBeUndefined();
  });

  it("neither throws nor writes when the cache is empty", async () => {
    const queryClient = new QueryClient();
    const rollback = await optimisticUpdate<Numbers>(
      queryClient,
      PAGES,
      doubled
    );
    rollback();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("cancels the queries under the prefix before it patches", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(FIRST, [1]);
    const order: string[] = [];
    vi.spyOn(queryClient, "cancelQueries").mockImplementation(() => {
      order.push("cancel");
      return Promise.resolve();
    });
    await optimisticUpdate<Numbers>(queryClient, PAGES, (cached) => {
      order.push("patch");
      return cached;
    });
    expect(queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: PAGES,
    });
    expect(order).toEqual(["cancel", "patch"]);
  });
});
