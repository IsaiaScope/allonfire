import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { EmailVerifiedNote } from "./email-verified-note";
import { TicketGate } from "./ticket-gate";

/** Where a verification link lands, at the ticket gate. A Server Component. */
export const EmailVerified = () => {
  const t = useTranslations("EmailVerified");
  return (
    <TicketGate page={AUTH.PAGE.EMAIL_VERIFIED} status={t("title")}>
      {/* The link's outcome is read in the browser, so the page stays static. */}
      <Suspense fallback={null}>
        <EmailVerifiedNote />
      </Suspense>
    </TicketGate>
  );
};
