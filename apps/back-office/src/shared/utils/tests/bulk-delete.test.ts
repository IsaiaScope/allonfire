// @module-tag unit
import { QueryClient } from "@tanstack/react-query";
import { bulkDeleteMutation } from "../bulk-delete";

const KEY = ["things", "delete"] as const;
const PAGES = ["things", "page"] as const;
const PER_PAGE = "perPage";
const FIRST = [...PAGES, { page: 1, perPage: 10 }] as const;
const SECOND = [...PAGES, { page: 2, perPage: 10 }] as const;
const UNSIZED = [...PAGES, { page: 3 }] as const;
const ONE = ["things", "one", "a"] as const;
const OVERVIEW = ["overview"] as const;

type Action = (ids: string[]) => Promise<number | null>;

/** Runs the mutation as TanStack does, on the given client. */
const run = (queryClient: QueryClient, action: Action, ids: string[]) =>
  queryClient
    .getMutationCache()
    .build(queryClient, mutationOf(action))
    .execute(ids);

const mutationOf = (action: Action) =>
  bulkDeleteMutation({
    action,
    invalidates: [PAGES, OVERVIEW],
    mutationKey: KEY,
    pages: PAGES,
    perPageParam: PER_PAGE,
    without: (rows: string[], ids) => rows.filter((row) => !ids.has(row)),
  });

describe("bulkDeleteMutation", () => {
  it("answers how many the action deleted", async () => {
    expect(
      await run(new QueryClient(), () => Promise.resolve(2), ["a", "b"])
    ).toEqual({
      deleted: 2,
    });
  });

  it("fails when the action answers a refusal", async () => {
    await expect(
      run(new QueryClient(), () => Promise.resolve(null), ["a"])
    ).rejects.toThrow();
  });

  it("refreshes every key it was given in this browser", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await mutationOf(() => Promise.resolve(1)).onSettled?.(
      { deleted: 1 },
      null,
      ["a"],
      () => undefined,
      { client, meta: undefined }
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PAGES });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: OVERVIEW });
  });

  it("keeps the mutation key it was given", () => {
    expect(mutationOf(() => Promise.resolve(1)).mutationKey).toEqual(KEY);
  });
});

describe("bulkDeleteMutation, before the API answers", () => {
  const seeded = () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(FIRST, ["a", "b"]);
    queryClient.setQueryData(SECOND, ["c", "a"]);
    queryClient.setQueryData(ONE, "a");
    queryClient.setQueryData(UNSIZED, ["a"]);
    return queryClient;
  };

  it("takes the rows out of every cached page while the action is pending", async () => {
    const queryClient = seeded();
    let release: () => void = () => undefined;
    const done = run(
      queryClient,
      () =>
        new Promise<number>((resolve) => {
          release = () => resolve(1);
        }),
      ["a"]
    );
    await vi.waitFor(() =>
      expect(queryClient.getQueryData(FIRST)).toEqual(["b"])
    );
    expect(queryClient.getQueryData(SECOND)).toEqual(["c"]);
    release();
    await done;
  });

  it("puts the rows back when the API refuses, and when the action throws", async () => {
    const refused = seeded();
    await run(refused, () => Promise.resolve(null), ["a"]).catch(
      () => undefined
    );
    expect(refused.getQueryData(FIRST)).toEqual(["a", "b"]);
    expect(refused.getQueryData(SECOND)).toEqual(["c", "a"]);
    const thrown = seeded();
    await run(thrown, () => Promise.reject(new Error("network")), ["a"]).catch(
      () => undefined
    );
    expect(thrown.getQueryData(FIRST)).toEqual(["a", "b"]);
    expect(thrown.getQueryData(SECOND)).toEqual(["c", "a"]);
  });

  it("hands the page size its key was asked with to the patch", async () => {
    const queryClient = seeded();
    const without = vi.fn((rows: string[]) => rows);
    await queryClient
      .getMutationCache()
      .build(
        queryClient,
        bulkDeleteMutation({
          action: () => Promise.resolve(1),
          invalidates: [],
          mutationKey: KEY,
          pages: PAGES,
          perPageParam: PER_PAGE,
          without,
        })
      )
      .execute(["a"]);
    expect(without).toHaveBeenCalledWith(["a", "b"], new Set(["a"]), 10);
  });

  it("leaves a cached page whose key holds no page size as it is", async () => {
    const queryClient = seeded();
    await run(queryClient, () => Promise.resolve(1), ["a"]);
    expect(queryClient.getQueryData(UNSIZED)).toEqual(["a"]);
  });

  it("leaves the one-row read cached", async () => {
    const queryClient = seeded();
    await run(queryClient, () => Promise.resolve(1), ["a"]);
    expect(queryClient.getQueryData(ONE)).toBe("a");
  });

  it("stays pending until the refetches finish", async () => {
    const queryClient = seeded();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(queryClient, "invalidateQueries").mockImplementation(() => gate);
    let settled = false;
    const done = run(queryClient, () => Promise.resolve(1), ["a"]).then(() => {
      settled = true;
    });
    await vi.waitFor(() =>
      expect(queryClient.invalidateQueries).toHaveBeenCalled()
    );
    await Promise.resolve();
    expect(settled).toBe(false);
    release();
    await done;
    expect(settled).toBe(true);
  });
});
