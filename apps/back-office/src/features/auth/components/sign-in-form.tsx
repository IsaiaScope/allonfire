"use client";

import { signIn } from "@allonfire/auth/features/next/actions/sign-in";
import type { SignInState } from "@allonfire/auth/features/next/constants/api";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AOFSubmitButton } from "@allonfire/ui/components/aof-submit-button";
import { useAOFForm } from "@allonfire/ui/lib/form";
import { formDataTo, submitAOFForm } from "@allonfire/ui/lib/form-submit";
import { cn } from "@allonfire/ui/lib/utils";
import { KeyRound, LoaderCircle, Mail, Nfc } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type SubmitEvent, useActionState, useCallback } from "react";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import { FormAlert } from "@/shared/components/form-alert";
import { SIGN_IN } from "../constants/sign-in";
import { signInSchema } from "../utils/sign-in-schema";

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
  initialState = {},
}: {
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
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) =>
      submitAOFForm(form, event, formDataTo(action)),
    [form, action]
  );
  // A server-side refusal or outage is not the fields' fault.
  const invalid =
    error === AUTH.SIGN_IN_ERROR.INVALID ||
    error === AUTH.SIGN_IN_ERROR.MISSING;

  return (
    <form
      action={action}
      aria-label={t("submit")}
      // The form rhythm: each field leaves 32px below itself (its error line).
      className="flex flex-col p-3"
      noValidate
      onSubmit={submit}
    >
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
      {/* Why the last try failed, in its kept place above the button. */}
      <FormAlert className="mb-2">
        {error ? t(`error.${error}`) : null}
      </FormAlert>
      {/* The gate's card reader: the one action, touched to pass. */}
      <AOFSubmitButton
        className={cn(kanjiAction(), "w-full")}
        pending={pending}
        pendingChildren={
          <>
            <LoaderCircle aria-hidden className="animate-spin" />
            {t("submitting")}
          </>
        }
        size="field"
      >
        <ActionKanji kanji={SIGN_IN.ENTER_KANJI} />
        <Nfc aria-hidden />
        {t("submit")}
      </AOFSubmitButton>
    </form>
  );
};
