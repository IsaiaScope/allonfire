"use client";

import { signIn } from "@allonfire/auth/features/next/actions/sign-in";
import {
  SIGN_IN_ERROR,
  type SignInState,
} from "@allonfire/auth/features/next/constants/api";
import { AOFSubmitButton } from "@allonfire/ui/components/aof-submit-button";
import { useAOFForm } from "@allonfire/ui/lib/form";
import { formDataTo, submitAOFForm } from "@allonfire/ui/lib/form-submit";
import { KeyRound, LoaderCircle, Mail, Nfc, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type SubmitEvent, useActionState, useCallback } from "react";
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
    error === SIGN_IN_ERROR.INVALID || error === SIGN_IN_ERROR.MISSING;

  return (
    <form
      action={action}
      aria-label={t("submit")}
      className="flex flex-col gap-4 px-3 py-4 sm:px-4 lg:p-6"
      noValidate
      onSubmit={submit}
    >
      {error ? (
        <p
          className="flex items-start gap-3 rounded-md border border-destructive bg-destructive/10 px-3 py-3 text-sm"
          role="alert"
        >
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-destructive"
          />
          {t(`error.${error}`)}
        </p>
      ) : null}
      <form.AppField name="email">
        {(email) => (
          <email.TextField
            autoComplete="username"
            icon={<Mail />}
            id="sign-in-email"
            inputMode="email"
            invalid={invalid}
            label={t("email")}
            required
            spellCheck={false}
            type="email"
            variant="primary"
          />
        )}
      </form.AppField>
      <form.AppField name="password">
        {(password) => (
          <password.TextField
            autoComplete="current-password"
            icon={<KeyRound />}
            id="sign-in-password"
            invalid={invalid}
            label={t("password")}
            required
            reveal={t("showPassword")}
            type="password"
            variant="primary"
          />
        )}
      </form.AppField>
      <AOFSubmitButton
        className="mt-1 h-12 w-full gap-2 font-bold text-base"
        pending={pending}
        pendingChildren={
          <>
            <LoaderCircle aria-hidden className="animate-spin" />
            {t("submitting")}
          </>
        }
      >
        <Nfc aria-hidden />
        {t("submit")}
      </AOFSubmitButton>
    </form>
  );
};
