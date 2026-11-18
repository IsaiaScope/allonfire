import { aofErrorMeta } from "@allonfire/core/features/next/query/utils/aof-query-errors";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { aofToast } from "../../../shared/hooks/use-aof-toast";
import type { bulkDeleteMutation } from "../utils/bulk-delete";
import { deletionMessage } from "../utils/deletion-message";

/** A feature's `delete` words, as its `useTranslations("<Feature>.delete")` reads them. */
export type BulkDeleteWords = (
  key: "done" | "failed" | "gone" | "partly",
  values?: { count?: number; deleted?: number; gone?: number }
) => string;

/**
 * Deleting the `selectedIds` rows of a feature: the question first (`ask`), then,
 * once confirmed, the question closed at once and its `mutation` sent (which
 * reads the list again). A deletion toasts how it went and clears the
 * selection (`onClear`); a failure is told by the App's error handler, in the
 * feature's `failed` words, and keeps the selection, so trying again is one
 * click.
 */
export const useBulkDeleteFlow = ({
  mutation,
  onClear,
  selectedIds,
  t,
}: {
  mutation: ReturnType<typeof bulkDeleteMutation>;
  onClear: () => void;
  selectedIds: string[];
  t: BulkDeleteWords;
}) => {
  const [asking, setAsking] = useState(false);
  const { isPending, mutate } = useMutation({
    ...mutation,
    meta: aofErrorMeta(t("failed")),
  });

  const ask = useCallback(() => setAsking(true), []);
  const confirm = useCallback(() => {
    setAsking(false);
    mutate(selectedIds, {
      onSuccess: ({ deleted }, named) => {
        onClear();
        aofToast(
          deletionMessage(named.length, deleted, {
            done: (count) => t("done", { count }),
            gone: (count) => t("gone", { count }),
            partly: (done, gone) => t("partly", { deleted: done, gone }),
          }),
          "success"
        );
      },
    });
  }, [mutate, onClear, selectedIds, t]);

  return { ask, asking, confirm, isPending, setAsking };
};
