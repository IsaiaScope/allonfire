import { AOF_ACTION } from "@allonfire/ui/shared/constants/action";
import type { AOFActionDressing } from "@allonfire/ui/shared/types/action-dressing";
import { cva } from "class-variance-authority";
import { ActionArt } from "@/shared/components/action-art";
import { MASCOT } from "./mascots";

/**
 * A Button with a heavier label (Nunito 700), a picture faint in its right
 * end (`ActionArt`: the label keeps clear of it, as in the Back Office's
 * `kanjiAction`).
 */
const action = cva("relative isolate min-w-40 overflow-hidden pr-12 font-bold");

/**
 * Laura's action buttons: the shared pieces draw each action's Tabler icon
 * (the arrow back, the refresh, the key); the dressing adds a faint picture
 * of the sea behind it, one per action (`MASCOT.ACTION`).
 */
export const ACTION_DRESSING = {
  className: action(),
  marks: {
    [AOF_ACTION.BACK]: <ActionArt art={MASCOT.ACTION[AOF_ACTION.BACK]} />,
    [AOF_ACTION.ENTER]: <ActionArt art={MASCOT.ACTION[AOF_ACTION.ENTER]} />,
    [AOF_ACTION.RETRY]: <ActionArt art={MASCOT.ACTION[AOF_ACTION.RETRY]} />,
    [AOF_ACTION.SAVE]: <ActionArt art={MASCOT.ACTION[AOF_ACTION.SAVE]} />,
    [AOF_ACTION.SEND]: <ActionArt art={MASCOT.ACTION[AOF_ACTION.SEND]} />,
  },
} as const satisfies AOFActionDressing;
