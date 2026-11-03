"use client";

import { AOFButton } from "@allonfire/ui/components/aof-button";
import { AOFTooltip } from "@allonfire/ui/components/aof-tooltip";
import { IconTrashX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { StationAlert } from "@/shared/components/station-alert";
import { USERS } from "../constants/users";
import { useDeleteUsersFlow } from "../hooks/use-delete-users-flow";
import { ToolbarActionBody, toolbarActionClass } from "./toolbar-action";

/**
 * The toolbar's Delete button, enabled while Users are selected, and the
 * question before they are deleted (`useDeleteUsersFlow`). Confirming closes
 * the question at once and the list fades the Users on their way out
 * (`useUsersBeingDeleted`) until the list read again has them gone; a
 * deletion then clears the selection, a failure keeps it, so trying again is
 * one click.
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
  const { ask, asking, confirm, isPending, setAsking } = useDeleteUsersFlow(
    ids,
    onClear
  );
  const count = ids.length;

  return (
    <>
      <AOFTooltip label={t("action")}>
        <AOFButton
          aria-label={t("action")}
          className={toolbarActionClass("icon", "destructive")}
          disabled={count === 0 || isPending}
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
