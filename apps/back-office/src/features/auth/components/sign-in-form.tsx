"use client";

import { signIn } from "@allonfire/auth/features/next/actions/sign-in";
import type { SignInState } from "@allonfire/auth/features/next/constants/api";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useAOFForm } from "@allonfire/ui/features/form/utils/form";
import { useAOFFormAction } from "@allonfire/ui/features/form/utils/form-submit";
import { KeyRound, Mail, Nfc } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Link } from "@/features/i18n/navigation";
import { FormAlert } from "@/shared/components/form-alert";
import { SIGN_IN } from "../constants/sign-in";
import { signInSchema } from "../utils/sign-in-schema";
import { GateSubmit } from "./gate-submit";

/**
 * The email and password form, an AOF form (ADR 0017). `useAOFForm` checks
 * the fields in the browser and, when they pass, hands the browser's own
 * `FormData` to the shared `signIn` server action through `useActionState`,
 * which holds why it failed and the pending flag. Before hydration the form
 * posts to the same action, which checks everything again: its answer is the
 * one that counts. `noValidate`: the browser's own bubbles speak its UI
 * language, not the page's. A success never comes back: the action redirects
 * home.
 */
export const SignInForm = ({
  callbackURL,
  initialState = {},
}: {
  /** Where a verification link sent on this sign-in lands: this page, in its language. */
  callbackURL?: string | undefined;
  /** The state to start from, e.g. an error the page already knows. */
  initialState?: SignInState;
}) => {
  const t = useTranslations("SignIn");
  const locale = useLocale();
  const [{ error }, action, pending] = useActionState(
    signIn.bind(null, locale),
    initialState
  );
  const form = useAOFForm({
    defaultValues: { email: "", password: "" },
    // A submit runs the onChange validators too.
    validators: {
      onChange: signInSchema({
        emailInvalid: t("field.emailInvalid"),
        emailRequired: t("field.emailRequired"),
        passwordRequired: t("field.passwordRequired"),
      }),
    },
  });
  const formProps = useAOFFormAction(form, action);
  // A server-side refusal or outage is not the fields' fault.
  const invalid =
    error === AUTH.SIGN_IN_ERROR.INVALID ||
    error === AUTH.SIGN_IN_ERROR.MISSING;
  const unverified = error === AUTH.SIGN_IN_ERROR.UNVERIFIED;

  return (
    <form
      aria-label={t("submit")}
      // The form rhythm: each field leaves 32px below itself (its error line).
      className="flex flex-col p-3"
      {...formProps}
    >
      {callbackURL ? (
        <input name="callbackURL" type="hidden" value={callbackURL} />
      ) : null}
      <form.AppField name="email">
        {(email) => (
          <email.TextField
            // Both fields are needed, so no asterisk marks either: the
            // inputs still say so to assistive tech.
            aria-required
            autoComplete="username"
            icon={<Mail />}
            id="sign-in-email"
            inputMode="email"
            invalid={invalid}
            label={t("email")}
            spellCheck={false}
            type="email"
          />
        )}
      </form.AppField>
      <form.AppField name="password">
        {(password) => (
          <password.TextField
            aria-required
            autoComplete="current-password"
            icon={<KeyRound />}
            id="sign-in-password"
            invalid={invalid}
            label={t("password")}
            reveal={t("showPassword")}
            type="password"
          />
        )}
      </form.AppField>
      <Link
        className="-mt-4 mb-4 self-end rounded-sm text-muted-foreground text-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        href={AUTH.PAGE.FORGOT_PASSWORD}
      >
        {t("forgot")}
      </Link>
      {/* The place kept above the button: why the last try failed, or, for a
          right password on an unverified email, that a link went out. */}
      <FormAlert
        className="mb-2"
        notice={unverified ? t("note.unverified") : null}
      >
        {error && !unverified ? t(`error.${error}`) : null}
      </FormAlert>
      {/* The gate's card reader: the one action, touched to pass. */}
      <GateSubmit
        className="w-full"
        icon={<Nfc aria-hidden />}
        kanji={SIGN_IN.ENTER_KANJI}
        pending={pending}
        pendingLabel={t("submitting")}
      >
        {t("submit")}
      </GateSubmit>
    </form>
  );
};
