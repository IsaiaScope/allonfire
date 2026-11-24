import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useLocale, useTranslations } from "next-intl";
import type { AOFAuthDressing } from "../types/auth-dressing";
import { AOFForgotPasswordForm } from "./aof-forgot-password-form";

/** Asking for a reset link, inside the App's frame. A Server Component. */
export const AOFForgotPassword = ({
  appUrl,
  dressing,
}: {
  /** The App's public address, where the reset link lands. */
  appUrl: string;
  dressing: AOFAuthDressing;
}) => {
  const t = useTranslations("Common.Auth.ForgotPassword");
  const locale = useLocale();
  const { Gate } = dressing;
  return (
    <Gate page={AUTH.PAGE.FORGOT_PASSWORD} status={t("title")}>
      <AOFForgotPasswordForm
        actions={dressing.actions}
        back={dressing.back}
        resetPage={`${appUrl}/${locale}${AUTH.PAGE.RESET_PASSWORD}`}
      />
    </Gate>
  );
};
