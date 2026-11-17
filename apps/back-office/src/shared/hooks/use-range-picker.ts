import type { DayRange } from "@allonfire/core/features/search/utc-day-range";
import { useCallback } from "react";

/**
 * What a list's Filter tab writes for its Created range: the search with
 * `created` set, or with it left out for none (the serializer leaves an
 * absent range out of the address, ADR 0031).
 */
export const useRangePicker = <
  Search extends { created?: DayRange | undefined },
>(
  search: Search,
  write: (next: Search) => void
) =>
  useCallback(
    (created: DayRange | null) =>
      write({ ...search, created: created ?? undefined }),
    [search, write]
  );
