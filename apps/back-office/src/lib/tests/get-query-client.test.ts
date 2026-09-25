// @module-tag unit
import { dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "../get-query-client";

describe("getQueryClient", () => {
  it("gives every server request its own client", () => {
    expect(getQueryClient()).not.toBe(getQueryClient());
  });

  it("dehydrates a query still pending, so the client streams it in", () => {
    const client = getQueryClient();
    // biome-ignore lint/complexity/noVoid: never settles, so the query stays pending; awaiting it would hang
    void client.prefetchQuery({
      queryFn: () => new Promise(() => undefined),
      queryKey: ["slow"],
    });
    const state = dehydrate(client);
    expect(state.queries.map((query) => query.queryKey)).toEqual([["slow"]]);
  });
});
