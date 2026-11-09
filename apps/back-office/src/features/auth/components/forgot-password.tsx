import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useLocale, useTranslations } from "next-intl";
import { ForgotPasswordForm } from "./forgot-password-form";
import { TicketGate } from "./ticket-gate";

/** Asking for a reset link at the ticket gate. A Server Component. */
export const ForgotPassword = ({
  appUrl,
}: {
  /** The App's public address, where the reset link lands. */
  appUrl: string;
}) => {
  const t = useTranslations("ForgotPassword");
  const locale = useLocale();
  return (
    <TicketGate page={AUTH.PAGE.FORGOT_PASSWORD} status={t("title")}>
      <ForgotPasswordForm
        resetPage={`${appUrl}/${locale}${AUTH.PAGE.RESET_PASSWORD}`}
      />
    </TicketGate>
  );
};
