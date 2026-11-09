"use client";

import { requestPasswordReset } from "@allonfire/auth/features/next/actions/password-reset";
import type { ForgotState } from "@allonfire/auth/features/next/constants/api";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useAOFForm } from "@allonfire/ui/features/form/utils/form";
import { useAOFFormAction } from "@allonfire/ui/features/form/utils/form-submit";
import { Mail, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/shared/components/form-alert";
import { RESET } from "../constants/reset";
import { forgotSchema } from "../utils/reset-schema";
import { BackToSignIn } from "./back-to-sign-in";
import { GateSubmit } from "./gate-submit";

/**
 * Asks for a reset link, an AOF form (ADR 0017): one email field, then the
 * same answer whether or not the address has an account. `resetPage` is
 * where the link lands: this App's Reset password page, in this language.
 */
export const ForgotPasswordForm = ({
  initialState = {},
  resetPage,
}: {
  /** The state to start from, e.g. an error the page already knows. */
  initialState?: ForgotState;
  resetPage: string;
}) => {
  const t = useTranslations("ForgotPassword");
  const locale = useLocale();
  const [{ error, sent }, action, pending] = useActionState(
    requestPasswordReset.bind(null, locale, resetPage),
    initialState
  );
  const form = useAOFForm({
    defaultValues: { email: "" },
    validators: {
      onChange: forgotSchema({
        emailInvalid: t("field.emailInvalid"),
        emailRequired: t("field.emailRequired"),
      }),
    },
  });
  const formProps = useAOFFormAction(form, action);
  return (
    <form aria-label={t("title")} className="flex flex-col p-3" {...formProps}>
      <h2 className="font-bold text-lg">{t("title")}</h2>
      <p className="mt-1 mb-6 text-muted-foreground text-sm">{t("intro")}</p>
      <form.AppField name="email">
        {(email) => (
          <email.TextField
            aria-required
            autoComplete="username"
            icon={<Mail />}
            id="forgot-email"
            inputMode="email"
            invalid={error === AUTH.FORGOT_ERROR.INVALID}
            label={t("email")}
            // Once the link is sent the address stays, locked, so the form
            // keeps its shape; the sent note takes the alert's place.
            readOnly={sent}
            spellCheck={false}
            type="email"
          />
        )}
      </form.AppField>
      <FormAlert
        className="mb-2 min-h-20"
        notice={sent ? t("note.sent") : null}
      >
        {error ? t(`error.${error}`) : null}
      </FormAlert>
      <div className="flex gap-2">
        <BackToSignIn />
        <GateSubmit
          disabled={Boolean(sent)}
          icon={<Send aria-hidden />}
          kanji={RESET.SEND_KANJI}
          pending={pending}
          pendingLabel={t("submitting")}
        >
          {t("submit")}
        </GateSubmit>
      </div>
    </form>
  );
};
