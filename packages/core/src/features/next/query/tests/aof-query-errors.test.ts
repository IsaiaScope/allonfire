// @module-tag unit
import { QueryClient } from "@tanstack/react-query";
import {
  type AOFErrorMeta,
  aofErrorCaches,
  aofErrorMeta,
} from "../aof-query-errors";

const FALLBACK = "Something went wrong.";
const OWN = "The Users could not be deleted.";
const ROWS = ["a User"];

const failing = () => Promise.reject(new Error("refused"));

/** A client whose failures go to `notify`, never retried. */
const clientNotifying = () => {
  const notify = vi.fn<(message: string) => void>();
  const client = new QueryClient({
    ...aofErrorCaches({ fallback: FALLBACK, notify }),
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return { client, notify };
};

const failQuery = async (meta: AOFErrorMeta = {}, shown?: string[]) => {
  const { client, notify } = clientNotifying();
  const queryKey = ["users"];
  if (shown) {
    client.setQueryData(queryKey, shown);
  }
  await client
    .query({ meta, queryFn: failing, queryKey, staleTime: 0 })
    .catch(() => undefined);
  return notify;
};

const failMutation = async (meta: AOFErrorMeta = {}) => {
  const { client, notify } = clientNotifying();
  await client
    .getMutationCache()
    .build(client, { meta, mutationFn: failing })
    .execute(undefined)
    .catch(() => undefined);
  return notify;
};

describe("aofErrorCaches: a query", () => {
  it("says nothing on a first load: its screen shows the error", async () => {
    expect(await failQuery()).not.toHaveBeenCalled();
  });

  it("says so when refreshing what is on screen fails", async () => {
    expect(await failQuery({}, ROWS)).toHaveBeenCalledWith(FALLBACK);
  });

  it("says its own message when it asks for one", async () => {
    expect(await failQuery(aofErrorMeta(OWN))).toHaveBeenCalledWith(OWN);
  });

  it("says nothing when it handles the error itself", async () => {
    expect(await failQuery(aofErrorMeta(false), ROWS)).not.toHaveBeenCalled();
  });
});

describe("aofErrorCaches: a mutation", () => {
  it("always says so, in the App's words by default", async () => {
    expect(await failMutation()).toHaveBeenCalledWith(FALLBACK);
  });

  it("says its own message when it has one", async () => {
    expect(await failMutation(aofErrorMeta(OWN))).toHaveBeenCalledWith(OWN);
  });

  it("says nothing when it handles the error itself", async () => {
    expect(await failMutation(aofErrorMeta(false))).not.toHaveBeenCalled();
  });
});
