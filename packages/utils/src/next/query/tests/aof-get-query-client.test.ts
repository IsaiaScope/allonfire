// @module-tag unit
import { dehydrate } from "@tanstack/react-query";
import { AOFGetQueryClient } from "../aof-get-query-client";

describe("AOFGetQueryClient on the server", () => {
  it("gives every call its own client", () => {
    expect(AOFGetQueryClient()).not.toBe(AOFGetQueryClient());
  });

  it("keeps fetched data fresh for 60 s by default", () => {
    expect(AOFGetQueryClient().getDefaultOptions().queries?.staleTime).toBe(
      60_000
    );
  });

  it("takes the App's staleTime", () => {
    expect(
      AOFGetQueryClient({ staleTime: 5000 }).getDefaultOptions().queries
        ?.staleTime
    ).toBe(5000);
  });

  it("dehydrates a query still pending, so the browser streams it in", () => {
    const client = AOFGetQueryClient();
    // Never settles, so the query stays pending.
    const pending = client.prefetchQuery({
      queryFn: () => new Promise(() => undefined),
      queryKey: ["slow"],
    });
    expect(pending).toBeInstanceOf(Promise);
    expect(dehydrate(client).queries.map((query) => query.queryKey)).toEqual([
      ["slow"],
    ]);
  });
});
