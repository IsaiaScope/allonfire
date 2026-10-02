import {
  defaultShouldDehydrateQuery,
  isServer,
  QueryClient,
} from "@tanstack/react-query";

/** Above zero, so the browser does not refetch what the server just sent. */
const DEFAULT_STALE_TIME_MS = 60_000;

export type AOFQueryClientOptions = { staleTime?: number | undefined };

const makeQueryClient = ({
  staleTime = DEFAULT_STALE_TIME_MS,
}: AOFQueryClientOptions) =>
  new QueryClient({
    defaultOptions: {
      dehydrate: {
        // Pending queries go to the client too: a server component can
        // prefetch without awaiting and the browser picks the result up.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      queries: { staleTime },
    },
  });

let browserQueryClient: QueryClient | undefined;

/**
 * A new client per server request; one client for the page in the browser.
 * The browser keeps the first client it built, so `options` on a later call
 * are ignored there.
 */
export const AOFGetQueryClient = (
  options: AOFQueryClientOptions = {}
): QueryClient => {
  if (isServer) {
    return makeQueryClient(options);
  }
  browserQueryClient ??= makeQueryClient(options);
  return browserQueryClient;
};
