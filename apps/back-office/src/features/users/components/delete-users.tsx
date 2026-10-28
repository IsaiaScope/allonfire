"use client";

import { aofErrorMeta } from "@allonfire/core/features/next/query/aof-query-errors";
import { AOFButton } from "@allonfire/ui/components/aof-button";
import { AOFTooltip } from "@allonfire/ui/components/aof-tooltip";
import { aofToast } from "@allonfire/ui/lib/use-aof-toast";
import { IconTrashX } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { StationAlert } from "@/shared/components/station-alert";
import { QUERY } from "@/shared/constants/query";
import { USERS } from "../constants/users";
import { deleteUsersMutation } from "../utils/users-mutations";
import { ToolbarActionBody, toolbarActionClass } from "./toolbar-action";

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
 * The toolbar's Delete button, enabled while Users are selected, and the
 * question before they are deleted. A deletion clears the selection and
 * refreshes the list; a failure keeps the selection, so trying again is one
 * click.
 */
export const DeleteUsers = ({
  ids,
  onClear,
}: {
  /** The Users selected, never the signed-in one. */
  ids: string[];
  onClear: () => void;
}) => {
  const t = useTranslations("Users.delete");
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState(false);
  // A failure is told by the App's error handler, in these words.
  const { isPending, mutate } = useMutation({
    ...deleteUsersMutation,
    meta: aofErrorMeta(t("failed")),
  });
  const count = ids.length;

  const ask = useCallback(() => setAsking(true), []);
  const confirm = useCallback(
    () =>
      mutate(ids, {
        onError: () => setAsking(false),
        onSuccess: async ({ deleted }, sent) => {
          setAsking(false);
          onClear();
          aofToast(doneMessage(t, sent.length, deleted), "success");
          await queryClient.invalidateQueries({ queryKey: QUERY.USERS.ALL });
        },
      }),
    [ids, mutate, onClear, queryClient, t]
  );

  return (
    <>
      <AOFTooltip label={t("action")}>
        <AOFButton
          aria-label={t("action")}
          className={toolbarActionClass("icon", "destructive")}
          disabled={count === 0}
          onClick={ask}
        >
          <ToolbarActionBody
            icon={<IconTrashX aria-hidden />}
            kanjiProps={{ kanji: USERS.DELETE_KANJI }}
            label={t("action")}
            shape="icon"
          />
        </AOFButton>
      </AOFTooltip>
      <StationAlert
        cancel={t("cancel")}
        confirm={t("confirm")}
        confirmKanji={USERS.DELETE_KANJI}
        description={t("description")}
        icon={<IconTrashX />}
        onConfirm={confirm}
        onOpenChange={setAsking}
        open={asking}
        pending={isPending}
        title={t("title", { count })}
      />
    </>
  );
};
