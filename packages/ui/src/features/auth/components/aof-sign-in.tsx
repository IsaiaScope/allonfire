import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useLocale, useTranslations } from "next-intl";
import type { AOFAuthDressing } from "../types/auth-dressing";
import { verifiedLanding } from "../utils/verified-landing";
import { AOFSignInForm } from "./aof-sign-in-form";

/**
 * Signing in: the form inside the App's frame. A Server Component: the
 * form is its only client part. `appName` fills the words that name the
 * App; `appUrl` is its public address, where a verification link lands.
 */
export const AOFSignIn = ({
  appName,
  appUrl,
  dressing,
}: {
  appName: string;
  appUrl?: string | undefined;
  dressing: AOFAuthDressing;
}) => {
  const t = useTranslations("Common.Auth.SignIn");
  const locale = useLocale();
  const { Gate } = dressing;
  return (
    <Gate page={AUTH.PAGE.SIGN_IN} status={t("submit")}>
      <AOFSignInForm
        actions={dressing.actions}
        appName={appName}
        callbackURL={appUrl && verifiedLanding(appUrl, locale)}
      />
    </Gate>
  );
};
