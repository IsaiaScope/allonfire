// @module-tag unit
import { QueryClient } from "@tanstack/react-query";
import { bulkDeleteMutation } from "../bulk-delete";

const KEY = ["things", "delete"] as const;
const LIST = ["things"] as const;
const OVERVIEW = ["overview"] as const;

/** Runs the mutation as TanStack does, on a client of its own. */
const run = (
  action: (ids: string[]) => Promise<number | null>,
  ids: string[]
) => {
  const client = new QueryClient();
  return client
    .getMutationCache()
    .build(client, mutationOf(action))
    .execute(ids);
};

const mutationOf = (action: (ids: string[]) => Promise<number | null>) =>
  bulkDeleteMutation({
    action,
    invalidates: [LIST, OVERVIEW],
    mutationKey: KEY,
  });

describe("bulkDeleteMutation", () => {
  it("answers how many the action deleted", async () => {
    expect(await run(() => Promise.resolve(2), ["a", "b"])).toEqual({
      deleted: 2,
    });
  });

  it("fails when the action answers a refusal", async () => {
    await expect(run(() => Promise.resolve(null), ["a"])).rejects.toThrow();
  });

  it("refreshes every key it was given in this browser", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await mutationOf(() => Promise.resolve(1)).onSettled?.(
      { deleted: 1 },
      null,
      ["a"],
      undefined,
      { client, meta: undefined }
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LIST });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: OVERVIEW });
  });

  it("keeps the mutation key it was given", () => {
    expect(mutationOf(() => Promise.resolve(1)).mutationKey).toEqual(KEY);
  });
});
