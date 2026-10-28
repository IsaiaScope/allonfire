import { MutationCache, QueryCache } from "@tanstack/react-query";

/**
 * What a query or mutation says about its failure, in its `meta`: its own
 * message for the toast, or `false` when its screen shows the error itself.
 */
export type AOFErrorMeta = { errorToast?: string | false };

/**
 * The `meta` for a query or mutation that tells its failure in its own words
 * (`string`), or not at all (`false`). Typed here, not through TanStack's
 * global `Register`, which only an `interface` can augment.
 */
export const aofErrorMeta = (errorToast: string | false) =>
  ({ errorToast }) satisfies AOFErrorMeta;

/** `meta.errorToast` when it is one a caller can give, else nothing. */
const toastOf = (meta: Record<string, unknown> | undefined) => {
  const toast = meta?.errorToast;
  return typeof toast === "string" || toast === false ? toast : undefined;
};

/** How an App shows a failure: `notify` (its toast) and its generic words. */
export type AOFQueryErrors = {
  fallback: string;
  notify: (message: string) => void;
};

/**
 * One place for every failed query and mutation, so a failure is told once
 * however many components share it. A mutation always tells, something the
 * visitor did failed; a query only when what is on screen could not be
 * refreshed: a first load that fails has nothing to show, so its screen
 * shows the error itself (a table's error state). `meta.errorToast` gives
 * either its own words, or `false` to stay silent.
 */
export const aofErrorCaches = ({ fallback, notify }: AOFQueryErrors) => {
  const tell = (toast: string | false | undefined, byDefault: boolean) => {
    if (toast === false || !(toast || byDefault)) {
      return;
    }
    notify(toast || fallback);
  };
  return {
    mutationCache: new MutationCache({
      onError: (_error, _variables, _result, mutation) =>
        tell(toastOf(mutation.meta), true),
    }),
    queryCache: new QueryCache({
      onError: (_error, query) =>
        tell(toastOf(query.meta), query.state.data !== undefined),
    }),
  };
};
