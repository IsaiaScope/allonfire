import {
  defaultShouldDehydrateQuery,
  isServer,
  QueryClient,
} from "@tanstack/react-query";

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      dehydrate: {
        // Pending queries go to the client too: a server component can
        // prefetch without awaiting and the browser picks the result up.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      queries: {
        // Above zero, so the browser does not refetch what the server just sent.
        staleTime: 60 * 1000,
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

/** A new client per server request; one shared client in the browser. */
export const getQueryClient = (): QueryClient => {
  if (isServer) {
    return makeQueryClient();
  }
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};
