import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";
import { TicketGate } from "./ticket-gate";

/** Choosing a new password through a reset link, at the ticket gate. */
export const ResetPassword = () => {
  const t = useTranslations("ResetPassword");
  return (
    <TicketGate page={AUTH.PAGE.RESET_PASSWORD} status={t("title")}>
      {/* The token is read in the browser, so the page stays static. */}
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </TicketGate>
  );
};
