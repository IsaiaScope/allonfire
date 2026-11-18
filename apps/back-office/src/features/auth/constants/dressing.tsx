import type { AOFAuthDressing } from "@allonfire/ui/features/auth/types/auth-dressing";
import { ACTION_DRESSING } from "@/shared/constants/action-dressing";
import { passwordRuleLine } from "@/shared/utils/password-rule-line";
import { BackToSignIn } from "../components/back-to-sign-in";
import { TicketGate } from "../components/ticket-gate";

/** The signed-out pages in the Japan Design: the ticket gate, brushed kanji on the actions. */
export const AUTH_DRESSING = {
  actions: ACTION_DRESSING,
  back: <BackToSignIn />,
  Gate: TicketGate,
  passwordRules: passwordRuleLine(),
} as const satisfies AOFAuthDressing;
