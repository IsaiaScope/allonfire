"use client";

import { requestPasswordReset } from "@allonfire/auth/features/next/actions/password-reset";
import type { ForgotState } from "@allonfire/auth/features/next/types/auth-state";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { IconMail, IconSend } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import type { AOFActionDressing } from "../../../shared/types/action-dressing";
import { AOFFormAlert } from "../../form/components/aof-form-alert";
import { useAOFForm } from "../../form/utils/form";
import { useAOFFormAction } from "../../form/utils/form-submit";
import { forgotSchema } from "../utils/reset-schema";
import { AOFGateSubmit } from "./aof-gate-submit";

/**
 * Asks for a reset link, an AOF form (ADR 0017): one email field, then the
 * same answer whether or not the address has an account. `resetPage` is
 * where the link lands: this App's Reset password page, in this language.
 */
export const AOFForgotPasswordForm = ({
  actions,
  back,
  initialState = {},
  resetPage,
}: {
  actions: AOFActionDressing;
  /** The way back to Sign in, left of the action. */
  back: ReactNode;
  /** The state to start from, e.g. an error the page already knows. */
  initialState?: ForgotState;
  resetPage: string;
}) => {
  const t = useTranslations("Common.Auth.ForgotPassword");
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
      <p className="mb-6 text-base text-muted-foreground">{t("intro")}</p>
      <form.AppField name="email">
        {(email) => (
          <email.TextField
            aria-required
            autoComplete="username"
            icon={<IconMail />}
            id="forgot-email"
            inputMode="email"
            invalid={error === AUTH.ERROR.FORGOT.INVALID}
            label={t("email")}
            // Once the link is sent the address stays, locked, so the form
            // keeps its shape; the sent note takes the alert's place.
            readOnly={sent}
            spellCheck={false}
            type="email"
          />
        )}
      </form.AppField>
      <AOFFormAlert
        className="mb-2 min-h-20"
        notice={sent ? t("note.sent") : null}
      >
        {error ? t(`error.${error}`) : null}
      </AOFFormAlert>
      <div className="flex gap-2">
        {back}
        <AOFGateSubmit
          action="send"
          actions={actions}
          disabled={Boolean(sent)}
          icon={<IconSend aria-hidden />}
          pending={pending}
          pendingLabel={t("submitting")}
        >
          {t("submit")}
        </AOFGateSubmit>
      </div>
    </form>
  );
};
