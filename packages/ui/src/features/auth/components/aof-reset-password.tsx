import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import type { AOFAuthDressing } from "../types/auth-dressing";
import { AOFResetPasswordForm } from "./aof-reset-password-form";

/** Choosing a new password through a reset link, inside the App's frame. */
export const AOFResetPassword = ({
  dressing,
}: {
  dressing: AOFAuthDressing;
}) => {
  const t = useTranslations("Common.Auth.ResetPassword");
  const { Gate } = dressing;
  return (
    <Gate page={AUTH.PAGE.RESET_PASSWORD} status={t("title")}>
      {/* The token is read in the browser, so the page stays static. */}
      <Suspense fallback={null}>
        <AOFResetPasswordForm
          actions={dressing.actions}
          back={dressing.back}
          {...(dressing.passwordRules && {
            ruleClassNames: dressing.passwordRules,
          })}
        />
      </Suspense>
    </Gate>
  );
};
