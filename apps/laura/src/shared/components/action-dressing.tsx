import {
  AOF_ACTION,
  type AOFAction,
} from "@allonfire/ui/shared/constants/action";
import type { AOFActionDressing } from "@allonfire/ui/shared/types/action-dressing";
import { IconAnchor } from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import { ActionArt } from "@/shared/components/action-art";
import { MASCOT } from "@/shared/constants/mascots";

/**
 * A Button with a heavier label (Nunito 700), a picture faint in its right
 * end (`ActionArt`: the label keeps clear of it, as in the Back Office's
 * `kanjiAction`).
 */
const action = cva("relative isolate min-w-40 overflow-hidden pr-12 font-bold");

/**
 * The same button, small: 32px tall, a 14px label and a smaller picture, as
 * the Back Office's compact action (its filters' Reset). For an action that
 * sits beside the page's content and is not the page's one (Show more photos),
 * where a field-height button would shout.
 */
const compact = cva(
  "relative isolate h-8 min-w-0 gap-1.5 overflow-hidden pr-8 pl-3 font-bold text-sm"
);
const smallArt = (which: AOFAction) => (
  <ActionArt art={MASCOT.ACTION[which]} className="right-1 size-5" />
);

/**
 * Laura's action buttons: the shared pieces draw each action's Tabler icon
 * (the arrow back, the refresh, the key); the dressing adds a faint picture
 * of the sea behind it, one per action (`MASCOT.ACTION`).
 */
export const ACTION_DRESSING = {
  className: action(),
  /** Laura goes in by the sea: an anchor, not the shared NFC tag. */
  icons: { [AOF_ACTION.ENTER]: <IconAnchor aria-hidden /> },
  marks: {
    [AOF_ACTION.BACK]: <ActionArt art={MASCOT.ACTION[AOF_ACTION.BACK]} />,
    [AOF_ACTION.ENTER]: <ActionArt art={MASCOT.ACTION[AOF_ACTION.ENTER]} />,
    [AOF_ACTION.RETRY]: <ActionArt art={MASCOT.ACTION[AOF_ACTION.RETRY]} />,
    [AOF_ACTION.SAVE]: <ActionArt art={MASCOT.ACTION[AOF_ACTION.SAVE]} />,
    [AOF_ACTION.SEND]: <ActionArt art={MASCOT.ACTION[AOF_ACTION.SEND]} />,
  },
} as const satisfies AOFActionDressing;

/** `ACTION_DRESSING` in its small size, for the same actions. */
export const COMPACT_ACTION = {
  className: compact(),
  marks: {
    [AOF_ACTION.BACK]: smallArt(AOF_ACTION.BACK),
    [AOF_ACTION.ENTER]: smallArt(AOF_ACTION.ENTER),
    [AOF_ACTION.RETRY]: smallArt(AOF_ACTION.RETRY),
    [AOF_ACTION.SAVE]: smallArt(AOF_ACTION.SAVE),
    [AOF_ACTION.SEND]: smallArt(AOF_ACTION.SEND),
  },
} as const satisfies AOFActionDressing;
