import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useLocale, useTranslations } from "next-intl";
import { verifiedLanding } from "../utils/verified-landing";
import { SignInForm } from "./sign-in-form";
import { TicketGate } from "./ticket-gate";

/**
 * Signing in at the ticket gate: the form, with the submit as the gate's
 * card reader. A Server Component: the form and the theme toggle are its
 * only client parts.
 */
export const SignIn = ({
  appUrl,
}: {
  /** The App's public address, where a verification link lands. */
  appUrl?: string | undefined;
}) => {
  const t = useTranslations("SignIn");
  const locale = useLocale();
  return (
    <TicketGate page={AUTH.PAGE.SIGN_IN} status={t("submit")}>
      <SignInForm callbackURL={appUrl && verifiedLanding(appUrl, locale)} />
    </TicketGate>
  );
};
