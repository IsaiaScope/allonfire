"use client";

import { resetPassword } from "@allonfire/auth/features/next/actions/password-reset";
import type { ResetState } from "@allonfire/auth/features/next/constants/api";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useAOFForm } from "@allonfire/ui/features/form/utils/form";
import { useAOFFormAction } from "@allonfire/ui/features/form/utils/form-submit";
import { aofButtonVariants } from "@allonfire/ui/shared/components/aof-button";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { KeyRound, KeySquare, MailPlus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { Link } from "@/features/i18n/navigation";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import { FormAlert } from "@/shared/components/form-alert";
import { PasswordRules } from "@/shared/components/password-rules";
import { ACTION_KANJI } from "@/shared/constants/action-kanji";
import { passwordChecks } from "@/shared/utils/password-checks";
import { RESET } from "../constants/reset";
import { resetSchema } from "../utils/reset-schema";
import { BackToSignIn } from "./back-to-sign-in";
import { GateNote } from "./gate-note";
import { GateSubmit } from "./gate-submit";

/** The rules ticked under the fields, from what both hold. */
const checksOf = ({
  values,
}: {
  values: { confirmPassword: string; password: string };
}) => passwordChecks(values);

/** Where a link that no longer works sends the visitor: a new one. */
const AskAgain = () => {
  const t = useTranslations("ResetPassword");
  return (
    <div className="flex flex-col gap-4 p-3">
      <h2 className="font-bold text-lg">{t("title")}</h2>
      <GateNote tone="warning">{t("error.invalidToken")}</GateNote>
      <div className="flex gap-2">
        <BackToSignIn />
        <Link
          className={cn(
            aofButtonVariants({ size: "field", variant: "default" }),
            kanjiAction(),
            "min-w-0 flex-1 shrink"
          )}
          href={AUTH.PAGE.FORGOT_PASSWORD}
        >
          <ActionKanji kanji={ACTION_KANJI.RETRY} />
          <MailPlus aria-hidden />
          {t("askAgain")}
        </Link>
      </div>
    </div>
  );
};

/**
 * The new password, typed twice with its rules ticked live, set through the
 * reset link's token (read from the address, so the page stays static).
 * Sign in follows; every earlier Session ended at the API. A link that no
 * longer works offers a new one.
 */
export const ResetPasswordForm = ({
  initialState = {},
}: {
  /** The state to start from, e.g. an error the page already knows. */
  initialState?: ResetState;
}) => {
  const t = useTranslations("ResetPassword");
  const locale = useLocale();
  const token = useSearchParams().get(AUTH.MAIL.TOKEN_PARAM) ?? "";
  const [{ error }, action, pending] = useActionState(
    resetPassword.bind(null, locale, token),
    initialState
  );
  const form = useAOFForm({
    defaultValues: { confirmPassword: "", password: "" },
    validators: {
      onChange: resetSchema({
        passwordMismatch: t("field.passwordMismatch"),
        passwordWeak: t("field.passwordWeak"),
      }),
    },
  });
  const formProps = useAOFFormAction(form, action);
  if (!token || error === AUTH.RESET_ERROR.INVALID_TOKEN) {
    return <AskAgain />;
  }
  return (
    <form aria-label={t("title")} className="flex flex-col p-3" {...formProps}>
      <h2 className="mb-6 font-bold text-lg">{t("title")}</h2>
      <form.AppField name="password">
        {(field) => (
          <field.TextField
            aria-required
            autoComplete="new-password"
            icon={<KeyRound />}
            id="reset-password"
            label={t("password")}
            reveal={t("showPassword")}
            type="password"
          />
        )}
      </form.AppField>
      <form.AppField name="confirmPassword">
        {(field) => (
          <field.TextField
            aria-required
            autoComplete="new-password"
            icon={<KeySquare />}
            id="reset-confirm-password"
            label={t("confirmPassword")}
            reveal={t("showPassword")}
            type="password"
          />
        )}
      </form.AppField>
      <form.Subscribe selector={checksOf}>
        {(checks) => <PasswordRules checks={checks} />}
      </form.Subscribe>
      <FormAlert className="mt-4 mb-2">
        {error ? t(`error.${error}`) : null}
      </FormAlert>
      <div className="flex gap-2">
        <BackToSignIn />
        <GateSubmit
          icon={<KeyRound aria-hidden />}
          kanji={RESET.SAVE_KANJI}
          pending={pending}
          pendingLabel={t("submitting")}
        >
          {t("submit")}
        </GateSubmit>
      </div>
    </form>
  );
};
