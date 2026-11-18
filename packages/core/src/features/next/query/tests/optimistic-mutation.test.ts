// @module-tag unit
import { QueryClient } from "@tanstack/react-query";
import {
  optimisticMutation,
  type PatchCache,
} from "../utils/optimistic-mutation";

const KEY = ["things", "change"] as const;
const PAGES = ["things", "page"] as const;
const OVERVIEW = ["overview"] as const;

type Action = (variables: string) => Promise<string | null>;

const optionsOf = (
  action: Action,
  extra: {
    patchCache?: PatchCache<string>;
    scope?: string;
  } = {}
) =>
  optimisticMutation({
    action,
    invalidates: [PAGES, OVERVIEW],
    mutationKey: KEY,
    ...extra,
  });

/** Runs the mutation as TanStack does, on the given client. */
const run = (
  queryClient: QueryClient,
  options: ReturnType<typeof optionsOf>,
  variables = "a"
) =>
  queryClient.getMutationCache().build(queryClient, options).execute(variables);

describe("optimisticMutation", () => {
  it("answers what the action answered", async () => {
    const queryClient = new QueryClient();
    expect(
      await run(
        queryClient,
        optionsOf(() => Promise.resolve("ok"))
      )
    ).toBe("ok");
  });

  it("fails when the action answers a refusal (null)", async () => {
    const queryClient = new QueryClient();
    await expect(
      run(
        queryClient,
        optionsOf(() => Promise.resolve(null))
      )
    ).rejects.toThrow();
  });

  it("fails when the action throws", async () => {
    const queryClient = new QueryClient();
    await expect(
      run(
        queryClient,
        optionsOf(() => Promise.reject(new Error("network")))
      )
    ).rejects.toThrow("network");
  });

  it("keeps the mutation key it was given", () => {
    expect(optionsOf(() => Promise.resolve("ok")).mutationKey).toEqual(KEY);
  });

  it("invalidates every key it was given, and settles only after the refetches", async () => {
    const queryClient = new QueryClient();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockImplementation(() => gate);
    let settled = false;
    const done = run(
      queryClient,
      optionsOf(() => Promise.resolve("ok"))
    ).then(() => {
      settled = true;
    });
    await vi.waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PAGES });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: OVERVIEW });
    await Promise.resolve();
    expect(settled).toBe(false);
    release();
    await done;
    expect(settled).toBe(true);
  });
});

describe("optimisticMutation, with a cache patch", () => {
  it("patches the cache before the action runs", async () => {
    const queryClient = new QueryClient();
    const order: string[] = [];
    await run(
      queryClient,
      optionsOf(
        () => {
          order.push("action");
          return Promise.resolve("ok");
        },
        {
          patchCache: () => {
            order.push("patch");
            return Promise.resolve(() => order.push("rollback"));
          },
        }
      )
    );
    expect(order).toEqual(["patch", "action"]);
  });

  it("rolls back on a refusal and on a throw, never on success", async () => {
    const rollbacks: string[] = [];
    const patchCache = () =>
      Promise.resolve(() => {
        rollbacks.push("rollback");
      });
    const queryClient = new QueryClient();
    await run(
      queryClient,
      optionsOf(() => Promise.resolve("ok"), { patchCache })
    );
    expect(rollbacks).toEqual([]);
    await run(
      queryClient,
      optionsOf(() => Promise.resolve(null), { patchCache })
    ).catch(() => undefined);
    expect(rollbacks).toEqual(["rollback"]);
    await run(
      queryClient,
      optionsOf(() => Promise.reject(new Error("network")), { patchCache })
    ).catch(() => undefined);
    expect(rollbacks).toEqual(["rollback", "rollback"]);
  });

  it("runs two mutations of the same scope one after the other", async () => {
    const queryClient = new QueryClient();
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const first = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const firstRun = run(
      queryClient,
      optionsOf(
        async () => {
          order.push("first starts");
          await first;
          order.push("first ends");
          return "ok";
        },
        { scope: "same" }
      )
    );
    const secondRun = run(
      queryClient,
      optionsOf(
        () => {
          order.push("second starts");
          return Promise.resolve("ok");
        },
        { scope: "same" }
      )
    );
    await vi.waitFor(() => expect(order).toEqual(["first starts"]));
    releaseFirst();
    await Promise.all([firstRun, secondRun]);
    expect(order).toEqual(["first starts", "first ends", "second starts"]);
  });
});
