import {
  defaultShouldDehydrateQuery,
  environmentManager,
  QueryClient,
} from "@tanstack/react-query";
import { UNIT } from "../../../shared/constants/units";
import { type AOFQueryErrors, aofErrorCaches } from "./aof-query-errors";

/** Above zero, so the browser does not refetch what the server just sent. */
const DEFAULT_STALE_TIME_MS = UNIT.MS_PER_MINUTE;

export type AOFQueryClientOptions = {
  /** How a failure is told (`aofErrorCaches`); none on the server. */
  errors?: AOFQueryErrors | undefined;
  staleTime?: number | undefined;
};

const makeQueryClient = ({
  errors,
  staleTime = DEFAULT_STALE_TIME_MS,
}: AOFQueryClientOptions) =>
  new QueryClient({
    ...(errors && aofErrorCaches(errors)),
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
  if (environmentManager.isServer()) {
    return makeQueryClient(options);
  }
  browserQueryClient ??= makeQueryClient(options);
  return browserQueryClient;
};
