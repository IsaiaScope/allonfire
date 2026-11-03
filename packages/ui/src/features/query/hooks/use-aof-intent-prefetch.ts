"use client";

import { useState } from "react";

/**
 * A link's prefetch, spent only once the visitor reaches for it: a pointer
 * over it, keyboard focus, or a finger landing. Spread the props onto any
 * `<Link>`, never a wrapper around it: before intent it prefetches nothing
 * of its own (`prefetch: false`), after it the content behind its address
 * too (`prefetch: true`, ADR 0028). For a list of many links to one route,
 * where viewport prefetching would read the server once per row. The
 * props replace the link's own handlers of the same names.
 */
export const useAOFIntentPrefetch = () => {
  const [reached, setReached] = useState(false);
  const reach = () => setReached(true);
  return {
    onFocus: reach,
    onPointerDown: reach,
    onPointerEnter: reach,
    prefetch: reached,
  };
};
