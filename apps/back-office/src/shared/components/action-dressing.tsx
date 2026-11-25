import type { AOFActionDressing } from "@allonfire/ui/shared/types/action-dressing";
import { RESET } from "@/features/auth/constants/reset";
import { SIGN_IN } from "@/features/auth/constants/sign-in";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import { ACTION_KANJI } from "@/shared/constants/action-kanji";

/**
 * The Japan Design's action buttons: the brushed face and a kanji for each
 * action the shared pieces draw (Back 戻, Retry 再, and Sign in's own).
 */
export const ACTION_DRESSING = {
  className: kanjiAction(),
  marks: {
    back: <ActionKanji kanji={ACTION_KANJI.BACK} />,
    enter: <ActionKanji kanji={SIGN_IN.KANJI.ENTER} />,
    retry: <ActionKanji kanji={ACTION_KANJI.RETRY} />,
    save: <ActionKanji kanji={RESET.KANJI.SAVE} />,
    send: <ActionKanji kanji={RESET.KANJI.SEND} />,
  },
} as const satisfies AOFActionDressing;
