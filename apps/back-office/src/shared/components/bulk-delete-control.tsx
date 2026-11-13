"use client";

import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { AOFTooltip } from "@allonfire/ui/shared/components/aof-tooltip";
import { IconTrashX } from "@tabler/icons-react";
import { StationAlert } from "@/shared/components/station-alert";
import {
  ToolbarActionBody,
  type ToolbarActionShape,
  toolbarActionClass,
} from "@/shared/components/toolbar-action";
import type { useBulkDeleteFlow } from "@/shared/hooks/use-bulk-delete-flow";

/** The words of a feature's `delete` namespace the control shows. */
export type BulkDeleteControlWords = (
  key: "action" | "cancel" | "confirm" | "description" | "title",
  values?: { count: number }
) => string;

/**
 * The toolbar's Delete button, enabled while rows are selected, and the
 * question before they are deleted (its `flow`, from `useBulkDeleteFlow`).
 * Confirming closes the question at once and the list fades the rows on
 * their way out until the list read again has them gone.
 */
export const BulkDeleteControl = ({
  count,
  flow: { ask, asking, confirm, isPending, setAsking },
  kanji,
  shape = "icon",
  t,
}: {
  /** How many rows are selected. */
  count: number;
  flow: ReturnType<typeof useBulkDeleteFlow>;
  /** The feature's delete kanji. */
  kanji: string;
  /** `icon` in a toolbar; `labeled` in a page's own header, where there is room. */
  shape?: Extract<ToolbarActionShape, "icon" | "labeled"> | undefined;
  t: BulkDeleteControlWords;
}) => (
  <>
    <AOFTooltip label={t("action")}>
      <AOFButton
        aria-label={t("action")}
        className={toolbarActionClass(shape, "destructive")}
        disabled={count === 0 || isPending}
        onClick={ask}
      >
        <ToolbarActionBody
          icon={<IconTrashX aria-hidden />}
          kanjiProps={{ kanji }}
          label={t("action")}
          shape={shape}
        />
      </AOFButton>
    </AOFTooltip>
    <StationAlert
      cancel={t("cancel")}
      confirm={t("confirm")}
      confirmKanji={kanji}
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
