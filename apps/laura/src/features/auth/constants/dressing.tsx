import type { AOFAuthDressing } from "@allonfire/ui/features/auth/types/auth-dressing";
import { ACTION_DRESSING } from "@/shared/constants/action-dressing";
import { BackToSignIn } from "../components/back-to-sign-in";
import { OceanGate } from "../components/ocean-gate";

/** The signed-out pages in the Ocean Design: the tide pool at the door. */
export const AUTH_DRESSING = {
  actions: ACTION_DRESSING,
  back: <BackToSignIn />,
  Gate: OceanGate,
} as const satisfies AOFAuthDressing;
