import { aofErrorMeta } from "@allonfire/core/features/next/query/utils/aof-query-errors";
import { aofToast } from "@allonfire/ui/lib/use-aof-toast";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { deleteUsersMutation } from "../utils/users-mutations";

/**
 * What a deletion says: how many went, and how many another Admin had
 * deleted already (the list on screen is a snapshot; deleting them again
 * changes nothing).
 */
const doneMessage = (
  t: ReturnType<typeof useTranslations<"Users.delete">>,
  asked: number,
  deleted: number
) => {
  const gone = asked - deleted;
  if (gone === 0) {
    return t("done", { count: deleted });
  }
  return deleted === 0
    ? t("gone", { count: gone })
    : t("partly", { deleted, gone });
};

/**
 * Deleting the `selected` Users: the question first (`ask`), then, once
 * confirmed, the question closed at once and `deleteUsersMutation` sent
 * (which reads the list again). A deletion toasts how it went and clears the
 * selection (`onClear`); a failure is told by the App's error handler and
 * keeps the selection, so trying again is one click.
 */
export const useDeleteUsersFlow = (selected: string[], onClear: () => void) => {
  const t = useTranslations("Users.delete");
  const [asking, setAsking] = useState(false);
  // A failure is told by the App's error handler, in these words.
  const { isPending, mutate } = useMutation({
    ...deleteUsersMutation,
    meta: aofErrorMeta(t("failed")),
  });

  const ask = useCallback(() => setAsking(true), []);
  const confirm = useCallback(() => {
    setAsking(false);
    mutate(selected, {
      onSuccess: ({ deleted }, sent) => {
        onClear();
        aofToast(doneMessage(t, sent.length, deleted), "success");
      },
    });
  }, [mutate, onClear, selected, t]);

  return { ask, asking, confirm, isPending, setAsking };
};
