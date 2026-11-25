"use client";

import { resetPassword } from "@allonfire/auth/features/next/actions/password-reset";
import type { ResetState } from "@allonfire/auth/features/next/types/auth-state";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { aofBaseNavigation } from "@allonfire/core/features/next/i18n/utils/aof-base-navigation";
import { IconKey, IconMailPlus, IconPassword } from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useActionState } from "react";
import { aofActionLinkClass } from "../../../shared/components/aof-button";
import type { AOFActionDressing } from "../../../shared/types/action-dressing";
import { AOFFormAlert } from "../../form/components/aof-form-alert";
import {
  AOFPasswordRules,
  type AOFPasswordRulesProps,
} from "../../form/components/aof-password-rules";
import { useAOFForm } from "../../form/utils/form";
import { useAOFFormAction } from "../../form/utils/form-submit";
import {
  type PasswordPair,
  passwordChecks,
} from "../../form/utils/password-checks";
import { resetSchema } from "../utils/reset-schema";
import { AOFGateNote } from "./aof-gate-note";
import { AOFGateSubmit } from "./aof-gate-submit";

const { Link } = aofBaseNavigation;

/** The rules ticked under the fields, from what both hold. */
const checksOf = ({ values }: { values: PasswordPair }) =>
  passwordChecks(values);

type DressedProps = {
  actions: AOFActionDressing;
  /** The way back to Sign in, left of the action. */
  back: ReactNode;
};

/** Where a link that no longer works sends the visitor: a new one. */
const AskAgain = ({ actions, back }: DressedProps) => {
  const t = useTranslations("Common.Auth.ResetPassword");
  return (
    <div className="flex flex-col gap-4 p-3">
      <p className="text-base text-muted-foreground">{t("expiredIntro")}</p>
      <AOFGateNote tone="warning">{t("error.invalidToken")}</AOFGateNote>
      <div className="flex gap-2">
        {back}
        <Link
          className={aofActionLinkClass(actions, "min-w-0 flex-1 shrink")}
          href={AUTH.PAGE.FORGOT_PASSWORD}
        >
          {actions.marks.retry}
          <IconMailPlus aria-hidden />
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
export const AOFResetPasswordForm = ({
  actions,
  back,
  initialState = {},
  ruleClassNames,
}: DressedProps & {
  /** The state to start from, e.g. an error the page already knows. */
  initialState?: ResetState;
  /** The Design's colours for a met rule. */
  ruleClassNames?: AOFPasswordRulesProps["classNames"];
}) => {
  const t = useTranslations("Common.Auth.ResetPassword");
  const locale = useLocale();
  const token = useSearchParams().get(AUTH.MAIL.PARAM.TOKEN) ?? "";
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
  if (!token || error === AUTH.ERROR.RESET.INVALID_TOKEN) {
    return <AskAgain actions={actions} back={back} />;
  }
  return (
    <form aria-label={t("title")} className="flex flex-col p-3" {...formProps}>
      <p className="mb-6 text-base text-muted-foreground">{t("intro")}</p>
      <form.AppField name="password">
        {(field) => (
          <field.TextField
            aria-required
            autoComplete="new-password"
            icon={<IconKey />}
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
            icon={<IconPassword />}
            id="reset-confirm-password"
            label={t("confirmPassword")}
            reveal={t("showPassword")}
            type="password"
          />
        )}
      </form.AppField>
      <form.Subscribe selector={checksOf}>
        {(checks) => (
          <AOFPasswordRules
            checks={checks}
            {...(ruleClassNames && { classNames: ruleClassNames })}
          />
        )}
      </form.Subscribe>
      <AOFFormAlert className="mt-4 mb-2">
        {error ? t(`error.${error}`) : null}
      </AOFFormAlert>
      <div className="flex gap-2">
        {back}
        <AOFGateSubmit
          action="save"
          actions={actions}
          icon={<IconKey aria-hidden />}
          pending={pending}
          pendingLabel={t("submitting")}
        >
          {t("submit")}
        </AOFGateSubmit>
      </div>
    </form>
  );
};
