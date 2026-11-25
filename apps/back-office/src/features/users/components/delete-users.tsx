"use client";

import { useTranslations } from "next-intl";
import { BulkDeleteControl } from "@/shared/components/bulk-delete-control";
import { USERS } from "../constants/users";
import { useDeleteUsersFlow } from "../hooks/use-delete-users-flow";

/**
 * The toolbar's Delete button for the Users selected, and the question before
 * they are deleted (`useDeleteUsersFlow`, shown by `BulkDeleteControl`). A
 * deletion clears the selection, a failure keeps it, so trying again is one
 * click.
 */
export const DeleteUsers = ({
  selectedIds,
  onClear,
}: {
  /** The Users selected, never the signed-in one. */
  selectedIds: string[];
  onClear: () => void;
}) => {
  const t = useTranslations("Users.delete");
  const flow = useDeleteUsersFlow(selectedIds, onClear);
  return (
    <BulkDeleteControl
      count={selectedIds.length}
      flow={flow}
      kanji={USERS.KANJI.DELETE}
      t={t}
    />
  );
};
