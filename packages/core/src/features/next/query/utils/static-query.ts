import { aofErrorMeta } from "./aof-query-errors";
import { retryUnlessRefused } from "./retry";

/**
 * The options every page's own read shares: never stale (`staleTime:
 * "static"`). The query is asked again only when an action refreshed it
 * (`invalidateStatic`) or the page hydrated a newer copy, never on a clock,
 * a focus or a reconnect. A number would make TanStack read the time while
 * the page prerenders, which Next refuses (`Date.now()` in a prerender) and
 * which blocks a soft navigation to the page; and a re-read the user never
 * asked for would reshuffle a deck, overwrite what a form saves on its
 * Version or ask every loaded page of a feed again. A list the visitor
 * browses by filters and pages is the one that wants a clock: it sets its
 * own `staleTime` (the page cache's `stale`).
 *
 * `retries` asks again that many times after a server or network failure,
 * never after a refusal; `silent` leaves the failure to the page (no toast).
 */
export const staticQuery = ({
  retries,
  silent = false,
}: {
  retries?: number;
  silent?: boolean;
} = {}) => ({
  ...(silent ? { meta: aofErrorMeta(false) } : {}),
  ...(retries === undefined ? {} : { retry: retryUnlessRefused(retries) }),
  staleTime: "static" as const,
});
