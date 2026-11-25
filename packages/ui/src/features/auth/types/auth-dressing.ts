import type { AppPath } from "@allonfire/auth/shared/constants/auth-schema";
import type { ComponentType, ReactNode } from "react";
import type { AOFActionDressing } from "../../../shared/types/action-dressing";
import type { AOFPasswordRulesProps } from "../../form/components/aof-password-rules";

/** What a signed-out page's frame is given: the page it is, what it announces. */
type AOFGateProps = {
  children: ReactNode;
  /** The page the frame stands on, where its language switch stays. */
  page: AppPath;
  /** What the frame announces about the page, e.g. its title. */
  status: string;
};

/**
 * How an App dresses the signed-out pages (Sign in, Forgot password, Reset
 * password, Email verified): the frame every one of them stands in, how its
 * action buttons look, the colours of its password rules, and the way back
 * to Sign in. The pages draw the
 * form, the fields and the words; none of the looks.
 */
export type AOFAuthDressing = {
  actions: AOFActionDressing;
  /** The way back to Sign in, set left of a password page's action. */
  back: ReactNode;
  Gate: ComponentType<AOFGateProps>;
  /** The colours of a met password rule; the primary when left out. */
  passwordRules?: AOFPasswordRulesProps["classNames"];
};
