import { AOF_ACTION } from "@allonfire/ui/shared/constants/action";
import type { AOFActionDressing } from "@allonfire/ui/shared/types/action-dressing";
import { cva } from "class-variance-authority";

/** A teal Button with a heavier label (Nunito 700). */
const action = cva("font-bold");

/**
 * Laura's action buttons. The shared pieces already draw each action's
 * Tabler icon (the arrow back, the refresh, the key), so the dressing adds no
 * second mark: one icon per button.
 */
export const ACTION_DRESSING = {
  className: action(),
  marks: {
    [AOF_ACTION.BACK]: null,
    [AOF_ACTION.ENTER]: null,
    [AOF_ACTION.RETRY]: null,
    [AOF_ACTION.SAVE]: null,
    [AOF_ACTION.SEND]: null,
  },
} as const satisfies AOFActionDressing;
