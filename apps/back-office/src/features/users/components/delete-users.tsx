"use client";

import {
  AOFActionBar,
  AOFActionBarItem,
} from "@allonfire/ui/components/aof-action-bar";
import { AOFAlertDialog } from "@allonfire/ui/components/aof-alert-dialog";
import { aofToast } from "@allonfire/ui/lib/use-aof-toast";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { api } from "@/features/api/utils/api";
import { QUERY } from "@/shared/constants/query";
import { deleteUsersMutation } from "../utils/users-queries";

/**
 * The bar shown while Users are selected, and the question before they are
 * deleted. A deletion clears the selection and refreshes the list; a failure
 * keeps the selection, so trying again is one click.
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
  const { isPending, mutate } = useMutation(deleteUsersMutation(api));
  const count = ids.length;

  const closeBar = useCallback(
    (open: boolean) => {
      if (!open) {
        onClear();
      }
    },
    [onClear]
  );
  // An Action Bar item closes the bar, and so clears the selection, unless
  // its select is prevented: Delete only asks.
  const ask = useCallback((event: Event) => {
    event.preventDefault();
    setAsking(true);
  }, []);
  const confirm = useCallback(
    () =>
      mutate(ids, {
        onError: () => {
          setAsking(false);
          aofToast(t("failed"), "error");
        },
        onSuccess: async ({ deleted }) => {
          setAsking(false);
          onClear();
          aofToast(t("done", { count: deleted }), "success");
          await queryClient.invalidateQueries({ queryKey: QUERY.USERS.ALL });
        },
      }),
    [ids, mutate, onClear, queryClient, t]
  );

  return (
    <>
      <AOFActionBar
        close={t("clear")}
        onOpenChange={closeBar}
        open={count > 0}
        selection={t("selected", { count })}
      >
        <AOFActionBarItem onSelect={ask} variant="destructive">
          <IconTrash />
          {t("action")}
        </AOFActionBarItem>
      </AOFActionBar>
      <AOFAlertDialog
        cancel={t("cancel")}
        confirm={t("confirm")}
        description={t("description")}
        onConfirm={confirm}
        onOpenChange={setAsking}
        open={asking}
        pending={isPending}
        title={t("title", { count })}
      />
    </>
  );
};
