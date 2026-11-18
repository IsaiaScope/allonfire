import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import type { AOFAuthDressing } from "../types/auth-dressing";

/** The words of an App that adds none of its own: the shared ones. */
export const STUB_MESSAGES = aofMessages("en", {});

/**
 * A Design with no taste, as a test dresses the signed-out pages: a frame
 * that is just a `<main>`, a class and a text mark per action, a plain link
 * back. Nothing the shared pages draw depends on more than this.
 */
export const STUB_DRESSING = {
  actions: {
    className: "stub-action",
    marks: {
      back: "BACK-MARK",
      enter: "ENTER-MARK",
      retry: "RETRY-MARK",
      save: "SAVE-MARK",
      send: "SEND-MARK",
    },
  },
  back: (
    <a aria-label="Back to Sign in" href={AUTH.PAGE.SIGN_IN}>
      Back
    </a>
  ),
  Gate: ({ children, page, status }) => (
    <main data-page={page} data-status={status}>
      {children}
    </main>
  ),
  passwordRules: { checkbox: "stub-rule-box", label: "stub-rule-label" },
} as const satisfies AOFAuthDressing;
