"use client";

import {
  AOFPasswordRules,
  type AOFPasswordRulesProps,
} from "@allonfire/ui/features/form/components/aof-password-rules";
import { passwordRuleLine } from "../utils/password-rule-line";

/** `AOFPasswordRules` ticked in the App's line green. */
export const PasswordRules = (
  props: Omit<AOFPasswordRulesProps, "classNames">
) => <AOFPasswordRules classNames={passwordRuleLine()} {...props} />;
