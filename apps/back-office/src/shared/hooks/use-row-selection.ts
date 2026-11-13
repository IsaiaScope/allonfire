import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import type { AOFRowSelection } from "@allonfire/ui/features/data-table/components/aof-data-table";
import { useCallback, useState } from "react";

/**
 * The rows selected in a table, which belong to the rows in view: when the
 * `view` (the address a list reads: its page, size and search) changes, the
 * selection starts again.
 */
export const useRowSelection = <View>(view: View & Json<View>) => {
  const [selection, setSelection] = useState<AOFRowSelection>({});
  const seen = stringifyJson(view);
  const [seenView, setSeenView] = useState(seen);
  if (seen !== seenView) {
    setSeenView(seen);
    setSelection({});
  }
  const clearSelection = useCallback(() => setSelection({}), []);
  return { clearSelection, selection, setSelection };
};
